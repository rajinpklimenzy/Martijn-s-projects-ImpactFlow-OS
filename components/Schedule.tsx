
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, MapPin, Calendar as CalendarIcon, ChevronLeft, 
  ChevronRight, Plus, ExternalLink, Sparkles, Loader2, X, 
  CheckCircle2, Circle, LayoutGrid, List, Info
} from 'lucide-react';
import { CalendarEvent, Task } from '../types';
import { 
  apiGetGoogleCalendarStatus, 
  apiGetGoogleCalendarEvents, 
  apiGetTasks
} from '../utils/api';
import { useToast } from '../contexts/ToastContext';

interface ScheduleProps {
  currentUser?: any;
  onNavigate: (tab: string) => void;
  onNewEvent: () => void;
}

type ViewMode = 'daily' | 'weekly' | 'monthly';

const Schedule: React.FC<ScheduleProps> = ({ currentUser, onNavigate, onNewEvent }) => {
  const { showError } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [dailyTasks, setDailyTasks] = useState<Task[]>([]);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  
  const hours = Array.from({ length: 24 }, (_, i) => i); // 12 AM to 11 PM (full day)

  // Auto-detect browser timezone
  const timezone = useMemo(() => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, []);

  const dateKey = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [selectedDate]);

  useEffect(() => {
    const checkConnectionStatus = async () => {
      if (!currentUser?.id) return;
      try {
        const response = await apiGetGoogleCalendarStatus(currentUser.id);
        setIsGoogleConnected(response.connected || false);
      } catch (err) {
        setIsGoogleConnected(false);
      }
    };
    checkConnectionStatus();
  }, [currentUser]);

  // Filter out daily recurring events (like "Office", "Working Hours", etc.)
  const filterDailyRecurringEvents = (events: CalendarEvent[]): CalendarEvent[] => {
    return events.filter(event => {
      // If the event has a recurringEventId, it's a recurring event instance
      // We'll check if it's likely a daily recurring event by examining patterns
      if (event.recurringEventId) {
        const title = (event.title || '').toLowerCase().trim();
        
        // Common patterns for daily recurring "non-event" entries
        const dailyPatterns = [
          'office',
          'working hours',
          'work hours',
          'availability',
          'busy',
          'out of office',
          'lunch',
          'break'
        ];
        
        // Check if the event title matches any daily pattern
        const isDailyPattern = dailyPatterns.some(pattern => title.includes(pattern));
        
        if (isDailyPattern) {
          return false; // Filter out this event
        }
      }
      
      return true; // Keep this event
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingEvents(true);
      
      if (isGoogleConnected && currentUser?.id) {
        try {
          const response = await apiGetGoogleCalendarEvents(dateKey, dateKey, currentUser.id);
          const googleEvents = response.data || [];
          // Filter out daily recurring events
          const filteredEvents = filterDailyRecurringEvents(googleEvents);
          setEvents(filteredEvents);
        } catch (err: any) {
          setEvents([]);
        }
      } else {
        setEvents([]);
      }

      try {
        const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
        const tasksResponse = await apiGetTasks(userId);
        const allTasks = Array.isArray(tasksResponse?.data || tasksResponse) 
          ? (tasksResponse?.data || tasksResponse) 
          : [];
        
        const filteredTasks = allTasks.filter((t: Task) => t.dueDate === dateKey);
        setDailyTasks(filteredTasks);
      } catch (err) {
        setDailyTasks([]);
      }

      setIsLoadingEvents(false);
    };

    fetchData();
  }, [dateKey, isGoogleConnected, currentUser]);

  const goToPrevious = () => {
    const prev = new Date(selectedDate);
    if (viewMode === 'daily') prev.setDate(prev.getDate() - 1);
    else if (viewMode === 'weekly') prev.setDate(prev.getDate() - 7);
    else prev.setMonth(prev.getMonth() - 1);
    setSelectedDate(prev);
  };

  const goToNext = () => {
    const next = new Date(selectedDate);
    if (viewMode === 'daily') next.setDate(next.getDate() + 1);
    else if (viewMode === 'weekly') next.setDate(next.getDate() + 7);
    else next.setMonth(next.getMonth() + 1);
    setSelectedDate(next);
  };

  const isToday = () => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  };

  const getEventPosition = (event: CalendarEvent) => {
    let eventStart = new Date(event.start);
    let eventEnd = new Date(event.end);
    const timelineStart = new Date(selectedDate);
    timelineStart.setHours(0, 0, 0, 0); // Start from midnight
    const minutesFromStart = (eventStart.getTime() - timelineStart.getTime()) / (1000 * 60);
    const durationMinutes = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60);
    const topPosition = minutesFromStart * (80 / 60) + 20; // Add 20px offset to match hour positions
    const height = durationMinutes * (80 / 60);
    return { top: topPosition, height: Math.max(height, 50) };
  };

  const formatTime = (timeStr: string): string => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return timeStr;
    }
  };

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'High': return 'text-red-500 bg-red-50 border-red-100';
      case 'Medium': return 'text-amber-500 bg-amber-50 border-amber-100';
      default: return 'text-blue-500 bg-blue-50 border-blue-100';
    }
  };

  // Helper to render current view content
  const renderViewContent = () => {
    if (viewMode === 'daily') {
      return (
        <div className="p-8 pt-12 pb-12 relative min-h-[2000px] bg-white">
          {hours.map((hour) => {
            const hourTop = hour * 80 + 20; // Add 20px offset to prevent cutting off the first hour
            return (
              <div key={hour} className="absolute left-0 right-0 group" style={{ top: `${hourTop}px` }}>
                <span className="absolute left-4 top-0 -translate-y-1/2 text-[10px] font-black text-slate-300 w-16 text-right pr-6 uppercase tracking-widest">
                  {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                </span>
                <div className="absolute left-24 top-0 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-slate-100 group-hover:bg-indigo-200 transition-colors" />
                <div className="absolute left-24 top-0 right-8 h-px bg-slate-50" />
              </div>
            );
          })}
          
          {events.map((event) => {
            const position = getEventPosition(event);
            return (
              <div
                key={event.id}
                className={`absolute left-28 right-8 p-4 rounded-3xl border shadow-sm transition-all hover:scale-[1.01] hover:shadow-xl group overflow-hidden bg-indigo-50 border-indigo-100`}
                style={{ top: `${position.top}px`, height: `${position.height}px` }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500/20 group-hover:w-2 transition-all" />
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-black text-sm truncate text-indigo-900`}>{event.title}</h4>
                    <div className="flex flex-wrap items-center gap-4 mt-2">
                      <span className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <Clock className="w-3 h-3 text-indigo-400" /> {formatTime(event.start)} - {formatTime(event.end)}
                      </span>
                    </div>
                  </div>
                  {event.htmlLink && (
                    <a
                      href={event.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm text-slate-400 hover:text-indigo-600 transition-all active:scale-95"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          {!isLoadingEvents && events.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center opacity-40">
              <CalendarIcon className="w-16 h-16 text-slate-200 mb-4" />
              <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">No schedule entries for this day</p>
            </div>
          )}
        </div>
      );
    }

    if (viewMode === 'weekly') {
      return (
        <div className="p-8 bg-white h-full min-h-[500px] flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4">
            <LayoutGrid className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Weekly View</h3>
          <p className="text-slate-400 text-sm max-w-xs mt-1">Multi-day scheduling logic is currently being optimized for high-performance enterprise syncing.</p>
          <button 
            onClick={() => setViewMode('daily')}
            className="mt-6 px-5 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 transition-all uppercase tracking-widest"
          >
            Back to Day View
          </button>
        </div>
      );
    }

    if (viewMode === 'monthly') {
      return (
        <div className="p-8 bg-white h-full min-h-[500px] flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4">
            <CalendarIcon className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Monthly Calendar</h3>
          <p className="text-slate-400 text-sm max-w-xs mt-1">The monthly strategic roadmap view is coming soon to help you plan long-term logistics transformation.</p>
          <button 
            onClick={() => setViewMode('daily')}
            className="mt-6 px-5 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 transition-all uppercase tracking-widest"
          >
            Back to Day View
          </button>
        </div>
      );
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-slate-500 text-sm font-medium">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-lg">
              <Clock className="w-3 h-3 text-indigo-600" />
              <span className="text-[10px] font-bold text-indigo-600 tracking-wide">{timezone}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            {(['daily', 'weekly', 'monthly'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                  viewMode === mode ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
            <button 
              onClick={goToPrevious}
              className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSelectedDate(new Date())}
              className={`px-4 py-1.5 font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all ${
                isToday() ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              Today
            </button>
            <button 
              onClick={goToNext}
              className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button 
            onClick={onNewEvent}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Entry
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Schedule</h3>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-lg">
                <Clock className="w-3 h-3 text-slate-500" />
                <span className="text-[9px] font-bold text-slate-500 tracking-wide">{timezone}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isLoadingEvents && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${isGoogleConnected ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
                {isGoogleConnected ? 'Google Workspace Connected' : 'Google Disconnected'}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto relative bg-white">
            {viewMode === 'daily' && dailyTasks.length > 0 && (
              <div className="px-6 py-6 bg-slate-50/50 border-b border-slate-100 space-y-3">
                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                   <CheckCircle2 className="w-3 h-3" /> Today's Deliverables
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dailyTasks.map(task => (
                    <div key={task.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm group hover:border-indigo-200 transition-all flex items-start gap-3">
                      <div className="mt-1">
                        {task.status === 'Done' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold truncate ${task.status === 'Done' ? 'line-through text-slate-400' : 'text-slate-900'}`}>{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                           <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {renderViewContent()}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="relative z-10">
              <Sparkles className="w-8 h-8 text-indigo-400 mb-6" />
              <h3 className="text-2xl font-black mb-2 leading-tight">Unified Workspace</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-8 opacity-80">Synchronize your calendar, billing, and accounting software in one central hub.</p>
              
              <button
                onClick={() => onNavigate('integrations')}
                className="w-full py-4 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-900 flex items-center justify-center gap-3"
              >
                Go to Integrations
              </button>
            </div>
            <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />
          </div>

          <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
             <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
               <Info className="w-6 h-6" />
             </div>
             <div className="space-y-1">
               <p className="text-xs font-bold text-slate-900 uppercase tracking-widest">Workspace Statistics</p>
               <p className="text-[10px] text-slate-400 font-medium leading-relaxed">No data collected for current period. Stats will populate as you add tasks and events.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Schedule;
