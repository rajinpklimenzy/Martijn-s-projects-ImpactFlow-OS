
import React, { useState, useEffect, useMemo } from 'react';
import { MOCK_TASKS } from '../constants';
import { 
  Clock, MapPin, Users, Calendar as CalendarIcon, ChevronLeft, 
  ChevronRight, Plus, ExternalLink, Sparkles, Loader2, X, 
  CheckCircle2, Circle, Layout, Tag
} from 'lucide-react';
import { CalendarEvent, Task } from '../types';
import { 
  apiGetGoogleCalendarAuthUrl, 
  apiGetGoogleCalendarStatus, 
  apiGetGoogleCalendarEvents, 
  apiDisconnectGoogleCalendar,
  apiGetTasks
} from '../utils/api';
import { useToast } from '../contexts/ToastContext';

interface ScheduleProps {
  currentUser?: any;
}

const Schedule: React.FC<ScheduleProps> = ({ currentUser }) => {
  const { showSuccess, showError } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [dailyTasks, setDailyTasks] = useState<Task[]>([]);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  
  // Hours for the agenda
  const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 9 PM

  const dateKey = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [selectedDate]);

  // Check Google Calendar connection status
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

  // Fetch Google Calendar events and Tasks
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingEvents(true);
      
      // 1. Fetch Calendar Events
      if (isGoogleConnected && currentUser?.id) {
        try {
          const response = await apiGetGoogleCalendarEvents(dateKey, dateKey, currentUser.id);
          const googleEvents = response.data || [];
          
          const filteredEvents = googleEvents.filter((event: CalendarEvent) => {
            if (event.isAllDay === true) return false;
            if (!event.start || !event.end) return false;
            const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
            if (dateOnlyPattern.test(event.start) || dateOnlyPattern.test(event.end)) return false;
            
            const startDate = new Date(event.start);
            const endDate = new Date(event.end);
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return false;
            if (startDate.getTime() === endDate.getTime()) return false;
            if (endDate.getTime() - startDate.getTime() < 60000) return false;
            
            return true;
          });
          
          const seenEvents = new Map<string, boolean>();
          const uniqueEvents: CalendarEvent[] = [];
          filteredEvents.forEach((event: CalendarEvent) => {
            const startTime = new Date(event.start).getTime();
            const endTime = new Date(event.end).getTime();
            const eventKey = `${(event.title || '').trim().toLowerCase()}_${startTime}_${endTime}`;
            if (!seenEvents.has(eventKey)) {
              seenEvents.set(eventKey, true);
              uniqueEvents.push(event);
            }
          });
          setEvents(uniqueEvents);
        } catch (err: any) {
          console.error('Failed to fetch Google Calendar events:', err);
          setEvents([]);
        }
      } else {
        setEvents([]);
      }

      // 2. Fetch Tasks for the day
      try {
        const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
        const tasksResponse = await apiGetTasks(userId);
        const allTasks = Array.isArray(tasksResponse?.data || tasksResponse) 
          ? (tasksResponse?.data || tasksResponse) 
          : [];
        
        // Filter tasks by date format YYYY-MM-DD
        const filteredTasks = allTasks.filter((t: Task) => t.dueDate === dateKey);
        setDailyTasks(filteredTasks);
      } catch (err) {
        console.error('Failed to fetch tasks for schedule:', err);
        // Fallback to mock for UI demonstration if API fails but we have mock data
        const mockFiltered = MOCK_TASKS.filter(t => t.dueDate === dateKey);
        setDailyTasks(mockFiltered);
      }

      setIsLoadingEvents(false);
    };

    fetchData();
  }, [dateKey, isGoogleConnected, currentUser]);

  // Date navigation
  const goToPreviousDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const goToNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const isToday = () => {
    const today = new Date();
    return selectedDate.toDateString() === today.toDateString();
  };

  // Handle Google Calendar connection
  const handleConnectGoogle = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!currentUser?.id) {
      showError('Please log in to connect Google Calendar');
      return;
    }
    setIsConnecting(true);
    try {
      const response = await apiGetGoogleCalendarAuthUrl(currentUser.id);
      const authUrl = response.data?.authUrl || response.authUrl;
      if (!authUrl) throw new Error('No authorization URL received');
      window.location.replace(authUrl);
    } catch (err: any) {
      console.error('[GOOGLE CALENDAR] Failed to get auth URL:', err);
      setIsConnecting(false);
      showError(err.message || 'Failed to connect Google Calendar.');
    }
  };

  const handleDisconnect = async () => {
    if (!currentUser?.id) return;
    if (!confirm('Are you sure you want to disconnect Google Calendar?')) return;
    try {
      await apiDisconnectGoogleCalendar(currentUser.id);
      setIsGoogleConnected(false);
      setEvents([]);
      showSuccess('Google Calendar disconnected successfully!');
    } catch (err) {
      showError('Failed to disconnect Google Calendar');
    }
  };

  const getEventPosition = (event: CalendarEvent) => {
    let eventStart = new Date(event.start);
    let eventEnd = new Date(event.end);
    const timelineStart = new Date(selectedDate);
    timelineStart.setHours(8, 0, 0, 0);
    const minutesFromStart = (eventStart.getTime() - timelineStart.getTime()) / (1000 * 60);
    const durationMinutes = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60);
    const topPosition = minutesFromStart * (80 / 60);
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

  const getEventColor = (event: CalendarEvent) => {
    const isPast = new Date(event.end) < new Date();
    if (isPast) return { bg: 'bg-slate-50', border: 'border-slate-200', opacity: 'opacity-60', text: 'text-slate-500' };
    return { bg: 'bg-indigo-50', border: 'border-indigo-100', opacity: '', text: 'text-indigo-900' };
  };

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'High': return 'text-red-500 bg-red-50 border-red-100';
      case 'Medium': return 'text-amber-500 bg-amber-50 border-amber-100';
      default: return 'text-blue-500 bg-blue-50 border-blue-100';
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily Schedule</h1>
          <p className="text-slate-500 text-sm font-medium">
            Agenda for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
          <button 
            onClick={goToPreviousDay}
            className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className={`px-6 py-1.5 font-bold text-xs uppercase tracking-widest rounded-xl transition-all ${
              isToday() ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {isToday() ? 'Today' : selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </button>
          <button 
            onClick={goToNextDay}
            className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agenda Timeline */}
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Daily Timeline</h3>
            <div className="flex items-center gap-3">
              {isLoadingEvents && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${isGoogleConnected ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
                <div className={`w-1 h-1 rounded-full ${isGoogleConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                {isGoogleConnected ? 'Google Calendar Sync' : 'Calendar Off'}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto relative bg-white">
            {/* All Day / Tasks Section */}
            {dailyTasks.length > 0 && (
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
                           <span className="text-[8px] font-bold text-slate-400 uppercase">Task</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-8 relative min-h-[1120px]">
              {/* Timeline markers */}
              {hours.map((hour) => {
                const hourTop = (hour - 8) * 80;
                return (
                  <div key={hour} className="absolute left-0 right-0 group" style={{ top: `${hourTop}px` }}>
                    <span className="absolute left-4 top-0 -translate-y-1/2 text-[10px] font-black text-slate-300 w-16 text-right pr-6 uppercase tracking-widest">
                      {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                    </span>
                    <div className="absolute left-24 top-0 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-slate-100 group-hover:bg-indigo-200 transition-colors" />
                    <div className="absolute left-24 top-0 right-8 h-px bg-slate-50" />
                  </div>
                );
              })}
              
              {/* Actual Calendar Events */}
              {events.map((event) => {
                const position = getEventPosition(event);
                const colors = getEventColor(event);
                return (
                  <div
                    key={event.id}
                    className={`absolute left-28 right-8 p-4 rounded-3xl border shadow-sm transition-all hover:scale-[1.01] hover:shadow-xl group overflow-hidden ${colors.bg} ${colors.border} ${colors.opacity || ''}`}
                    style={{ top: `${position.top}px`, height: `${position.height}px` }}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500/20 group-hover:w-2 transition-all" />
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-black text-sm truncate ${colors.text}`}>{event.title}</h4>
                        <div className="flex flex-wrap items-center gap-4 mt-2">
                          <span className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            <Clock className="w-3 h-3 text-indigo-400" /> {formatTime(event.start)} - {formatTime(event.end)}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[200px]">
                              <MapPin className="w-3 h-3 text-red-400" /> {event.location}
                            </span>
                          )}
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

              {!isLoadingEvents && events.length === 0 && dailyTasks.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center opacity-40">
                  <CalendarIcon className="w-16 h-16 text-slate-200 mb-4" />
                  <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">No Schedule Data Available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="relative z-10">
              <Sparkles className="w-8 h-8 text-indigo-400 mb-6" />
              <h3 className="text-2xl font-black mb-2 leading-tight">Unified Workflow</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-8 opacity-80">Sync your external Google Calendar to bridge the gap between team tasks and personal routine.</p>
              
              {isGoogleConnected ? (
                <button
                  onClick={handleDisconnect}
                  className="w-full py-4 bg-white/10 hover:bg-red-500/10 text-white hover:text-red-400 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 border border-white/10 hover:border-red-500/20"
                >
                  <X className="w-4 h-4" /> Disconnect Sync
                </button>
              ) : (
                <button
                  onClick={(e) => handleConnectGoogle(e)}
                  disabled={isConnecting}
                  className="w-full py-4 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-900 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CalendarIcon className="w-4 h-4" /> Authorize Google</>}
                </button>
              )}
            </div>
            <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />
          </div>

          <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-8 space-y-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Pending Insights</h3>
            <div className="space-y-6">
              {[
                { title: 'API Sync Issues', type: 'System', color: 'text-amber-500' },
                { title: 'New Deal Proposal', type: 'Workflow', color: 'text-indigo-500' }
              ].map((item, idx) => (
                <div key={idx} className="group cursor-pointer flex items-start gap-4">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${item.color.replace('text', 'bg')}`} />
                  <div>
                    <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{item.title}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mt-1">{item.type} Alert</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full py-3.5 bg-slate-50 text-indigo-600 text-[10px] font-black rounded-2xl hover:bg-indigo-50 transition-all uppercase tracking-widest border border-slate-100">
              Workspace Overview
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Schedule;
