
import React, { useState, useEffect } from 'react';
import { MOCK_TASKS } from '../constants';
import { Clock, MapPin, Users, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, ExternalLink, Sparkles, Loader2, X } from 'lucide-react';
import { CalendarEvent } from '../types';
import { apiGetGoogleCalendarAuthUrl, apiGetGoogleCalendarStatus, apiGetGoogleCalendarEvents, apiDisconnectGoogleCalendar } from '../utils/api';
import { useToast } from '../contexts/ToastContext';

interface ScheduleProps {
  currentUser?: any;
}

const Schedule: React.FC<ScheduleProps> = ({ currentUser }) => {
  const { showSuccess, showError } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  
  // Hours for the agenda
  const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 9 PM

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

    // Listen for disconnection events from Settings page
    const handleDisconnection = () => {
      setIsGoogleConnected(false);
      setEvents([]); // Clear events when disconnected
    };

    // Listen for sync events from Settings page
    const handleSync = () => {
      // Trigger event refetch by updating selectedDate slightly
      const newDate = new Date(selectedDate);
      newDate.setMilliseconds(newDate.getMilliseconds() + 1);
      setSelectedDate(newDate);
    };

    window.addEventListener('google-calendar-disconnected', handleDisconnection);
    window.addEventListener('google-calendar-sync', handleSync);
    return () => {
      window.removeEventListener('google-calendar-disconnected', handleDisconnection);
      window.removeEventListener('google-calendar-sync', handleSync);
    };
  }, [currentUser, selectedDate]);

  // Fetch Google Calendar events
  useEffect(() => {
    const fetchEvents = async () => {
      if (!isGoogleConnected || !currentUser?.id) {
        // Show empty if not connected
        setEvents([]);
        setIsLoadingEvents(false);
        return;
      }

      setIsLoadingEvents(true);
      try {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const response = await apiGetGoogleCalendarEvents(dateStr, dateStr, currentUser.id);
        const googleEvents = response.data || [];
        
        // Filter out all-day events and events without proper time information
        const filteredEvents = googleEvents.filter((event: CalendarEvent) => {
          // Skip all-day events
          if (event.isAllDay === true) {
            return false;
          }
          
          // Skip events without start/end times
          if (!event.start || !event.end) {
            return false;
          }
          
          // Check if start/end are date-only strings (YYYY-MM-DD format) - these are all-day events
          const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
          if (dateOnlyPattern.test(event.start) || dateOnlyPattern.test(event.end)) {
            return false;
          }
          
          // Parse start and end times
          const startDate = new Date(event.start);
          const endDate = new Date(event.end);
          
          // Skip if dates are invalid
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return false;
          }
          
          // Skip if start and end times are the same (no duration, like "5:30 AM - 5:30 AM")
          if (startDate.getTime() === endDate.getTime()) {
            return false;
          }
          
          // Only include events that have actual time duration (at least 1 minute)
          const duration = endDate.getTime() - startDate.getTime();
          if (duration < 60000) { // Less than 1 minute
            return false;
          }
          
          return true;
        });
        
        // Deduplicate events by title and exact start/end time
        // This handles cases where the same event might appear multiple times with different IDs
        const seenEvents = new Map<string, boolean>();
        const uniqueEvents: CalendarEvent[] = [];
        
        filteredEvents.forEach((event: CalendarEvent) => {
          // Normalize the event data for comparison
          const normalizedTitle = (event.title || '').trim().toLowerCase();
          const startTime = new Date(event.start).getTime();
          const endTime = new Date(event.end).getTime();
          
          // Create a unique key from normalized title and exact start/end times
          // This catches duplicates even if IDs or other fields differ
          const eventKey = `${normalizedTitle}_${startTime}_${endTime}`;
          
          if (seenEvents.has(eventKey)) {
            console.log('[DUPLICATE] Skipping duplicate event:', event.title, event.start, '-', event.end);
            return; // Duplicate found, skip it
          }
          
          seenEvents.set(eventKey, true);
          uniqueEvents.push(event);
        });
        
        console.log(`[CALENDAR] Filtered ${googleEvents.length} events to ${filteredEvents.length} valid events, ${uniqueEvents.length} unique events`);
        
        // Only show filtered and deduplicated Google Calendar events with valid times
        setEvents(uniqueEvents);
      } catch (err: any) {
        console.error('Failed to fetch Google Calendar events:', err);
        // Show empty on error instead of mock data
        setEvents([]);
        // If error is "not connected", update status
        if (err.message?.includes('not connected') || err.code === 'GOOGLE_CALENDAR_NOT_CONNECTED') {
          setIsGoogleConnected(false);
        }
      } finally {
        setIsLoadingEvents(false);
      }
    };

    fetchEvents();
  }, [selectedDate, isGoogleConnected, currentUser]);

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const connected = urlParams.get('connected');
    const error = urlParams.get('error');

    if (connected === 'true') {
      setIsGoogleConnected(true);
      // Refresh connection status to get latest data
      if (currentUser?.id) {
        apiGetGoogleCalendarStatus(currentUser.id).then(response => {
          setIsGoogleConnected(response.connected || true);
        }).catch(() => {
          setIsGoogleConnected(true); // Assume connected if status check fails
        });
      }
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      showSuccess('Google Calendar connected successfully!');
    } else if (error) {
      const decodedError = decodeURIComponent(error);
      console.error('Google Calendar connection error:', decodedError);
      showError(`Failed to connect Google Calendar: ${decodedError}`);
      setIsGoogleConnected(false);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [currentUser]);

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
      console.log('[GOOGLE CALENDAR] OAuth response:', response);
      
      // Handle response structure (could be response.data or response.authUrl)
      const authUrl = response.data?.authUrl || response.authUrl;
      
      if (!authUrl) {
        console.error('[GOOGLE CALENDAR] Invalid response structure:', response);
        throw new Error('No authorization URL received from server. Please check server configuration.');
      }

      console.log('[GOOGLE CALENDAR] Redirecting to:', authUrl);
      // Redirect to Google OAuth - use window.location.replace to avoid back button issues
      window.location.replace(authUrl);
    } catch (err: any) {
      console.error('[GOOGLE CALENDAR] Failed to get auth URL:', err);
      setIsConnecting(false);
      
      let errorMessage = err.message || 'Failed to connect Google Calendar.';
      
      // Provide helpful error messages
      if (err.message?.includes('not configured') || err.code === 'OAUTH_NOT_CONFIGURED') {
        errorMessage = 'Google Calendar OAuth is not configured on the server. Please contact your administrator.';
      } else if (err.message?.includes('User ID')) {
        errorMessage = 'Please log in to connect Google Calendar.';
      }
      
      showError(errorMessage);
    }
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    if (!currentUser?.id) return;

    if (!confirm('Are you sure you want to disconnect Google Calendar?')) return;

    try {
      await apiDisconnectGoogleCalendar(currentUser.id);
      setIsGoogleConnected(false);
      setEvents([]); // Clear events when disconnected
      showSuccess('Google Calendar disconnected successfully!');
    } catch (err: any) {
      console.error('Failed to disconnect:', err);
      showError('Failed to disconnect Google Calendar');
    }
  };

  // Calculate event position and height based on actual times
  const getEventPosition = (event: CalendarEvent) => {
    let eventStart: Date;
    let eventEnd: Date;

    // Handle time format (HH:MM) - fallback for time-only strings
    if (/^\d{2}:\d{2}$/.test(event.start)) {
      const [startHour, startMin] = event.start.split(':').map(Number);
      const [endHour, endMin] = event.end.split(':').map(Number);
      eventStart = new Date(selectedDate);
      eventStart.setHours(startHour, startMin, 0, 0);
      eventEnd = new Date(selectedDate);
      eventEnd.setHours(endHour, endMin, 0, 0);
    } else {
      // Handle ISO datetime strings
      eventStart = new Date(event.start);
      eventEnd = new Date(event.end);
    }

    // Calculate position from top of timeline (8 AM = 0)
    const timelineStart = new Date(selectedDate);
    timelineStart.setHours(8, 0, 0, 0);
    
    // Calculate minutes from 8 AM
    const minutesFromStart = (eventStart.getTime() - timelineStart.getTime()) / (1000 * 60);
    const durationMinutes = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60);
    
    // Each hour is 80px, so each minute is 80/60 = 1.333px
    const topPosition = minutesFromStart * (80 / 60);
    const height = durationMinutes * (80 / 60);
    
    return {
      top: topPosition,
      height: Math.max(height, 40), // Minimum height of 40px
      eventStart,
      eventEnd
    };
  };

  // Format time from ISO string or time string
  const formatTime = (timeStr: string): string => {
    // If it's already in HH:MM format, return as is
    if (/^\d{2}:\d{2}$/.test(timeStr)) {
      return timeStr;
    }

    // If it's an ISO string, parse it
    try {
      const date = new Date(timeStr);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes.toString().padStart(2, '0');
      return `${displayHours}:${displayMinutes} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  // Check if event is in the past
  const isEventPast = (event: CalendarEvent): boolean => {
    try {
      let eventEnd: Date;
      
      if (/^\d{2}:\d{2}$/.test(event.end)) {
        const [endHour, endMin] = event.end.split(':').map(Number);
        eventEnd = new Date(selectedDate);
        eventEnd.setHours(endHour, endMin, 0, 0);
      } else {
        eventEnd = new Date(event.end);
      }
      
      const now = new Date();
      return eventEnd < now;
    } catch {
      return false;
    }
  };

  // Get event status (accepted, declined, tentative, needsAction)
  const getEventStatus = (event: CalendarEvent): string | null => {
    // Check if event has status field (from Google Calendar)
    if ((event as any).status) {
      return (event as any).status;
    }
    // Check if event has attendees with responseStatus
    if ((event as any).attendees && Array.isArray((event as any).attendees)) {
      const currentUserEmail = currentUser?.email?.toLowerCase();
      const userAttendee = (event as any).attendees.find((a: any) => 
        a.email?.toLowerCase() === currentUserEmail
      );
      if (userAttendee?.responseStatus) {
        return userAttendee.responseStatus; // 'accepted', 'declined', 'tentative', 'needsAction'
      }
    }
    return null;
  };

  // Get event color based on status, past time, type or source
  const getEventColor = (event: CalendarEvent) => {
    const isPast = isEventPast(event);
    const status = getEventStatus(event);
    
    // Past events - muted colors
    if (isPast) {
      return { bg: 'bg-slate-100', border: 'border-slate-200', opacity: 'opacity-60' };
    }
    
    // Status-based colors (for accepted/declined events)
    if (status === 'accepted') {
      return { bg: 'bg-emerald-50', border: 'border-emerald-200', opacity: '' };
    }
    if (status === 'declined') {
      return { bg: 'bg-red-50', border: 'border-red-200', opacity: '' };
    }
    if (status === 'tentative') {
      return { bg: 'bg-yellow-50', border: 'border-yellow-200', opacity: '' };
    }
    
    // Default colors based on source or type
    if (event.source === 'google') {
      return { bg: 'bg-indigo-50', border: 'border-indigo-100', opacity: '' };
    }
    
    const colorMap: Record<string, { bg: string; border: string }> = {
      'meeting': { bg: 'bg-indigo-50', border: 'border-indigo-100' },
      'task': { bg: 'bg-emerald-50', border: 'border-emerald-100' },
      'deadline': { bg: 'bg-red-50', border: 'border-red-100' },
      'reminder': { bg: 'bg-yellow-50', border: 'border-yellow-100' },
      'custom': { bg: 'bg-purple-50', border: 'border-purple-100' }
    };
    return { ...colorMap[event.type] || colorMap['meeting'], opacity: '' };
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Daily Schedule</h1>
          <p className="text-slate-500 text-sm">
            Reviewing agenda for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <button 
            onClick={goToPreviousDay}
            className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToToday}
            className={`px-4 py-1 font-bold text-sm rounded-lg transition-colors ${
              isToday() 
                ? 'bg-indigo-600 text-white' 
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            {isToday() ? 'Today' : selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </button>
          <button 
            onClick={goToNextDay}
            className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors"
            aria-label="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agenda Timeline */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Agenda</h3>
            <div className="flex items-center gap-2">
              {isLoadingEvents && (
                <div className="flex items-center gap-2 text-slate-500 text-xs">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Loading events...</span>
                </div>
              )}
              <div className={`flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] font-bold ${
                isGoogleConnected 
                  ? 'bg-emerald-50 text-emerald-600' 
                  : 'bg-red-50 text-red-600'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  isGoogleConnected 
                    ? 'bg-emerald-500 animate-pulse' 
                    : 'bg-red-500'
                }`} />
                {isGoogleConnected ? 'Google Calendar Connected' : 'Not Connected'}
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-0 relative">
            {/* Timeline hours */}
            {hours.map((hour) => {
              const hourTop = (hour - 8) * 80; // Position from top (8 AM = 0)
              return (
                <div key={hour} className="absolute left-0 right-0" style={{ top: `${hourTop}px` }}>
                  {/* Time label first */}
                  <span className="absolute left-0 top-0 text-xs font-bold text-slate-500 w-16 text-right pr-3">
                    {hour === 12 
                      ? '12 PM' 
                      : hour > 12 
                        ? `${hour - 12} PM` 
                        : `${hour} AM`}
                  </span>
                  {/* Dot after time */}
                  <div className="absolute left-16 top-0 -translate-x-1/2 w-2 h-2 rounded-full bg-slate-200 group-hover:bg-indigo-400 transition-colors" />
                  {/* Horizontal line */}
                  <div className="absolute left-16 top-0 right-0 h-px bg-slate-100" />
                </div>
              );
            })}
            
            {/* Events positioned by actual time */}
            {events.map((event) => {
              const position = getEventPosition(event);
              const colors = getEventColor(event);
              return (
                <div
                  key={event.id}
                  className={`absolute left-20 right-4 p-3 rounded-xl border transition-all hover:scale-[1.01] hover:shadow-lg ${colors.bg} ${colors.border} ${colors.opacity || ''}`}
                  style={{
                    top: `${position.top}px`,
                    height: `${position.height}px`,
                    minHeight: '50px'
                  }}
                >
                  <div className="flex justify-between items-start h-full gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm truncate">{event.title}</h4>
                      <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatTime(event.start)} - {formatTime(event.end)}
                        </span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                          <MapPin className="w-3 h-3" /> <span className="truncate">{event.location}</span>
                        </div>
                      )}
                    </div>
                    {event.htmlLink && (
                      <a
                        href={event.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-sm text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                        aria-label="Open in Google Calendar"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Timeline container height - 14 hours * 80px = 1120px */}
            <div className="relative" style={{ height: '1120px', minHeight: '1120px' }} />
            
            {/* Empty state */}
            {!isLoadingEvents && events.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center py-12">
                <CalendarIcon className="w-12 h-12 text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium">No events scheduled for this day</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
              <Sparkles className="w-6 h-6 text-indigo-400 mb-4" />
              <h3 className="text-lg font-bold mb-2">Sync Your Schedule</h3>
              <p className="text-slate-400 text-xs leading-relaxed mb-6">Connect your personal Google Calendar to merge logistical deadlines with your daily routine.</p>
              
              {isGoogleConnected ? (
                <button
                  onClick={handleDisconnect}
                  className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-white/20"
                >
                  <X className="w-4 h-4" />
                  Disconnect Calendar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleConnectGoogle(e);
                  }}
                  disabled={isConnecting}
                  className="w-full py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                <CalendarIcon className="w-4 h-4" />
                Connect Calendar
                    </>
                  )}
              </button>
              )}
            </div>
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Pending Tasks</h3>
            <div className="space-y-4">
              {MOCK_TASKS.slice(0, 3).map(task => (
                <div key={task.id} className="group cursor-pointer">
                  <div className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{task.title}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Due {task.dueDate}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-2 text-xs font-bold text-indigo-600 border border-indigo-100 rounded-xl hover:bg-indigo-50 transition-all">
              View All Tasks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Schedule;
