/**
 * Phase 3: ActivityTimeline Component
 * REQ-06 - Unified activity timeline merging notes, emails, calls, tasks, meetings, and system events
 */

import React, { useState, useMemo } from 'react';
import { 
  MessageSquare, Mail, Phone, CheckSquare, Calendar, History, 
  Search, Filter, Loader2, MoreVertical, User, Clock
} from 'lucide-react';

export type ActivityType = 'note' | 'email' | 'call' | 'task' | 'meeting' | 'system' | 'all';

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: string | Date;
  userId?: string;
  userName?: string;
  userEmail?: string;
  metadata?: Record<string, any>;
  icon?: React.ReactNode;
}

interface ActivityTimelineProps {
  activities: ActivityEntry[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onAddNote?: () => void;
  onAddEmail?: () => void;
  onAddCall?: () => void;
  onAddTask?: () => void;
  onAddMeeting?: () => void;
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  activities,
  isLoading = false,
  onLoadMore,
  hasMore = false,
  onAddNote,
  onAddEmail,
  onAddCall,
  onAddTask,
  onAddMeeting
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ActivityType>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Group activities by date
  const groupedActivities = useMemo(() => {
    const groups: Record<string, ActivityEntry[]> = {};
    
    activities.forEach(activity => {
      const date = new Date(activity.timestamp);
      const dateKey = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(activity);
    });

    // Sort activities within each group (newest first)
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return dateB - dateA;
      });
    });

    return groups;
  }, [activities]);

  // Filter activities
  const filteredGroups = useMemo(() => {
    const filtered: Record<string, ActivityEntry[]> = {};
    
    Object.entries(groupedActivities).forEach(([dateKey, activities]) => {
      const filteredActivities = activities.filter(activity => {
        // Type filter
        if (filterType !== 'all' && activity.type !== filterType) {
          return false;
        }
        
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesTitle = activity.title.toLowerCase().includes(query);
          const matchesDescription = activity.description?.toLowerCase().includes(query);
          const matchesUser = activity.userName?.toLowerCase().includes(query);
          if (!matchesTitle && !matchesDescription && !matchesUser) {
            return false;
          }
        }
        
        return true;
      });
      
      if (filteredActivities.length > 0) {
        filtered[dateKey] = filteredActivities;
      }
    });
    
    return filtered;
  }, [groupedActivities, filterType, searchQuery]);

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'note':
        return <MessageSquare className="w-4 h-4" />;
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'call':
        return <Phone className="w-4 h-4" />;
      case 'task':
        return <CheckSquare className="w-4 h-4" />;
      case 'meeting':
        return <Calendar className="w-4 h-4" />;
      case 'system':
        return <History className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: ActivityType) => {
    switch (type) {
      case 'note':
        return 'bg-blue-500';
      case 'email':
        return 'bg-indigo-500';
      case 'call':
        return 'bg-green-500';
      case 'task':
        return 'bg-amber-500';
      case 'meeting':
        return 'bg-purple-500';
      case 'system':
        return 'bg-slate-500';
      default:
        return 'bg-slate-400';
    }
  };

  const formatTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search and Filters */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 border rounded-lg text-sm transition-colors ${
              filterType !== 'all'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
        
        {showFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            {(['all', 'note', 'email', 'call', 'task', 'meeting', 'system'] as ActivityType[]).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setFilterType(type);
                  setShowFilters(false);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filterType === type
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Activity Composer (if callbacks provided) */}
      {(onAddNote || onAddEmail || onAddCall || onAddTask || onAddMeeting) && (
        <div className="px-6 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2 flex-wrap">
            {onAddNote && (
              <button
                onClick={onAddNote}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Note
              </button>
            )}
            {onAddEmail && (
              <button
                onClick={onAddEmail}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Mail className="w-4 h-4" />
                Email
              </button>
            )}
            {onAddCall && (
              <button
                onClick={onAddCall}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call
              </button>
            )}
            {onAddTask && (
              <button
                onClick={onAddTask}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <CheckSquare className="w-4 h-4" />
                Task
              </button>
            )}
            {onAddMeeting && (
              <button
                onClick={onAddMeeting}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Meeting
              </button>
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isLoading && activities.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : Object.keys(filteredGroups).length === 0 ? (
          <div className="py-20 text-center">
            <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-400">No activities found</p>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery || filterType !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Start by adding a note, email, or other activity'}
            </p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
            <div className="space-y-8">
              {Object.entries(filteredGroups).map(([dateKey, dateActivities]) => (
                <div key={dateKey}>
                  {/* Date Header */}
                  <div className="sticky top-0 z-10 bg-slate-50 -ml-2 pl-6 mb-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {dateKey}
                    </h3>
                  </div>
                  
                  {/* Activities */}
                  <div className="space-y-6 ml-4">
                    {dateActivities.map((activity) => (
                      <div key={activity.id} className="relative flex gap-4">
                        {/* Icon */}
                        <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${getActivityColor(activity.type)} text-white shadow-sm`}>
                          {activity.icon || getActivityIcon(activity.type)}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0 pb-6">
                          <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-slate-900 mb-1">
                                  {activity.title}
                                </h4>
                                {activity.description && (
                                  <p className="text-sm text-slate-600 line-clamp-2">
                                    {activity.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-slate-400">
                                  {formatTime(activity.timestamp)}
                                </span>
                              </div>
                            </div>
                            
                            {/* User Attribution */}
                            {(activity.userName || activity.userEmail) && (
                              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                                <User className="w-3 h-3 text-slate-400" />
                                <span className="text-xs text-slate-500">
                                  {activity.userName || activity.userEmail}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Load More */}
            {hasMore && onLoadMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={onLoadMore}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                      Loading...
                    </>
                  ) : (
                    'Load more activities'
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityTimeline;
