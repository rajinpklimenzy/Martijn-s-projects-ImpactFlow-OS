
import React from 'react';
import { UserPlus, MessageSquare, CheckSquare, AlertTriangle, Bell, Shield, Check, RefreshCw, Mail, AtSign, Send, TrendingUp } from 'lucide-react';
import { Notification } from '../types';

interface NotificationsDropdownProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onClose: () => void;
  onViewAll?: () => void;
  onNavigate?: (tab: string) => void;
}

const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({ 
  notifications, onMarkAsRead, onMarkAllAsRead, onRefresh, isRefreshing = false, onClose, onViewAll, onNavigate
}) => {
  const getIcon = (type: Notification['type'], title?: string) => {
    if (type === 'note-marked' || title?.toLowerCase().includes('marked')) return <UserPlus className="w-4 h-4 text-indigo-500" />;
    if (title?.toLowerCase().includes('pipeline')) return <TrendingUp className="w-4 h-4 text-purple-500" />;
    switch (type) {
      case 'lead': return <UserPlus className="w-4 h-4 text-blue-500" />;
      case 'deal': return <MessageSquare className="w-4 h-4 text-indigo-500" />;
      case 'task': return <CheckSquare className="w-4 h-4 text-emerald-500" />;
      case 'payment': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'email-routing': return <Send className="w-4 h-4 text-amber-500" />;
      case 'email-assigned': return <Mail className="w-4 h-4 text-blue-500" />;
      case 'email-mention': return <AtSign className="w-4 h-4 text-violet-500" />;
      case 'new-email': return <Mail className="w-4 h-4 text-slate-600" />;
      default: return <Shield className="w-4 h-4 text-slate-400" />;
    }
  };

  const getBg = (type: Notification['type'], title?: string) => {
    if (type === 'note-marked' || title?.toLowerCase().includes('marked')) return 'bg-indigo-50';
    if (title?.toLowerCase().includes('pipeline')) return 'bg-purple-50';
    switch (type) {
      case 'lead': return 'bg-blue-50';
      case 'deal': return 'bg-indigo-50';
      case 'task': return 'bg-emerald-50';
      case 'payment': return 'bg-red-50';
      case 'email-routing': return 'bg-amber-50';
      case 'email-assigned': return 'bg-blue-50';
      case 'email-mention': return 'bg-violet-50';
      case 'new-email': return 'bg-slate-100';
      default: return 'bg-slate-50';
    }
  };

  return (
    <div className="absolute top-full right-0 mt-2 w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <Bell className="w-4 h-4 text-slate-500" />
          Notifications
        </h3>
        <div className="flex items-center gap-3">
          {onRefresh && (
            <button 
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh notifications"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button 
            onClick={onMarkAllAsRead}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider"
          >
            Mark all as read
          </button>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {notifications.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {notifications.map((n) => (
              <div 
                key={n.id} 
                className={`p-4 flex gap-4 hover:bg-slate-50 transition-colors relative cursor-pointer group ${!n.read ? 'bg-indigo-50/10' : ''}`}
                onClick={() => {
                  onMarkAsRead(n.id);
                  if (n.link) {
                    if (n.link.startsWith('/?tab=') && onNavigate) {
                      const url = new URL(n.link, window.location.origin);
                      const tabParam = url.searchParams.get('tab');
                      if (tabParam) {
                        onNavigate(tabParam);
                        localStorage.setItem('activeTab', tabParam);
                        window.history.replaceState(null, '', n.link);
                        onClose();
                      } else {
                        window.location.href = n.link;
                      }
                    } else if (n.link.startsWith('/')) {
                      window.location.href = n.link;
                    } else {
                      window.location.href = n.link;
                    }
                  }
                }}
              >
                <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${getBg(n.type, n.title)}`}>
                  {getIcon(n.type, n.title)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <p className={`text-sm font-semibold truncate ${n.read ? 'text-slate-600' : 'text-slate-900'}`}>{n.title}</p>
                    <span className="text-[10px] text-slate-400 font-medium shrink-0">{n.timestamp}</span>
                  </div>
                  <p className={`text-xs mt-0.5 line-clamp-2 ${n.read ? 'text-slate-400' : 'text-slate-500'}`}>{n.message}</p>
                </div>
                {!n.read && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">
            <Check className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs">No new notifications at this time.</p>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-center">
        <button 
          onClick={() => {
            onClose();
            if (onViewAll) {
              onViewAll();
            }
          }}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-widest transition-colors"
        >
          View all activity
        </button>
      </div>
    </div>
  );
};

export default NotificationsDropdown;
