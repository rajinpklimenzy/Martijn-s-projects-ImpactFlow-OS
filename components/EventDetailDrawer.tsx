import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  X,
  Clock,
  MapPin,
  Calendar as CalendarIcon,
  User,
  FileText,
  ExternalLink,
  Edit2,
  Video,
  Copy,
  Check,
  HelpCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Save,
  Trash2,
} from 'lucide-react';
import { CalendarEvent, GoogleCalendarListItem } from '../types';
import {
  apiUpdateEvent,
  apiDeleteEvent,
  apiUpdateGoogleCalendarEvent,
  apiDeleteGoogleCalendarEvent,
  apiCreateGoogleCalendarEvent,
} from '../utils/api';
import { useToast } from '../contexts/ToastContext';

const VIDEO_LINK_REGEX = {
  meet: /https?:\/\/(?:www\.)?(?:meet\.google\.com|meeting\.google\.com)\/[^\s<>"']+/gi,
  zoom: /https?:\/\/(?:[a-z0-9.-]+\.)?zoom\.us\/(?:j\/)?[^\s<>"']+/gi,
  teams: /https?:\/\/(?:teams\.microsoft\.com|.*\.teams\.microsoft\.com)\/[^\s<>"']+/gi,
  webex: /https?:\/\/(?:[a-z0-9.-]+\.)?webex\.com\/[^\s<>"']+/gi,
  generic: /https?:\/\/[^\s<>"']+/gi,
};

type VideoPlatform = 'google_meet' | 'zoom' | 'teams' | 'webex' | 'generic';

function getVideoLinkAndPlatform(event: CalendarEvent): { url: string; platform: VideoPlatform } | null {
  // 1. conferenceData (Google Meet)
  const entryPoints = event.conferenceData?.entryPoints;
  if (entryPoints?.length) {
    const video = entryPoints.find(
      (e) => e.entryPointType === 'video' || e.uri?.includes('meet.') || e.uri?.includes('zoom') || e.uri?.includes('teams') || e.uri?.includes('webex')
    ) || entryPoints[0];
    if (video?.uri) {
      const u = video.uri;
      if (u.includes('meet.') || u.includes('meeting.google')) return { url: u, platform: 'google_meet' };
      if (u.includes('zoom')) return { url: u, platform: 'zoom' };
      if (u.includes('teams')) return { url: u, platform: 'teams' };
      if (u.includes('webex')) return { url: u, platform: 'webex' };
      return { url: u, platform: 'generic' };
    }
  }
  // 2. location
  const loc = event.location || '';
  let m = loc.match(VIDEO_LINK_REGEX.meet);
  if (m?.[0]) return { url: m[0], platform: 'google_meet' };
  m = loc.match(VIDEO_LINK_REGEX.zoom);
  if (m?.[0]) return { url: m[0], platform: 'zoom' };
  m = loc.match(VIDEO_LINK_REGEX.teams);
  if (m?.[0]) return { url: m[0], platform: 'teams' };
  m = loc.match(VIDEO_LINK_REGEX.webex);
  if (m?.[0]) return { url: m[0], platform: 'webex' };
  // 3. description
  const desc = event.description || '';
  m = desc.match(VIDEO_LINK_REGEX.meet);
  if (m?.[0]) return { url: m[0], platform: 'google_meet' };
  m = desc.match(VIDEO_LINK_REGEX.zoom);
  if (m?.[0]) return { url: m[0], platform: 'zoom' };
  m = desc.match(VIDEO_LINK_REGEX.teams);
  if (m?.[0]) return { url: m[0], platform: 'teams' };
  m = desc.match(VIDEO_LINK_REGEX.webex);
  if (m?.[0]) return { url: m[0], platform: 'webex' };
  m = desc.match(VIDEO_LINK_REGEX.generic);
  if (m?.[0] && (m[0].includes('meet') || m[0].includes('zoom') || m[0].includes('teams') || m[0].includes('webex'))) {
    if (m[0].includes('meet')) return { url: m[0], platform: 'google_meet' };
    if (m[0].includes('zoom')) return { url: m[0], platform: 'zoom' };
    if (m[0].includes('teams')) return { url: m[0], platform: 'teams' };
    if (m[0].includes('webex')) return { url: m[0], platform: 'webex' };
  }
  return null;
}

function getJoinButtonLabel(event: CalendarEvent): string {
  try {
    const now = Date.now();
    const start = new Date(event.start).getTime();
    const end = new Date(event.end).getTime();
    const minutesUntilStart = (start - now) / 60000;
    const minutesAfterEnd = (now - end) / 60000;
    if (minutesUntilStart <= 15 && minutesAfterEnd <= 30) return 'Join Now';
    if (minutesAfterEnd > 30) return 'Rejoin Meeting';
    if (minutesUntilStart > 15) return `Join Meeting (starts in ${Math.floor(minutesUntilStart)} min)`;
    return 'Join Meeting';
  } catch {
    return 'Join Meeting';
  }
}

function getPlatformLabel(platform: VideoPlatform): string {
  switch (platform) {
    case 'google_meet': return 'Google Meet';
    case 'zoom': return 'Zoom';
    case 'teams': return 'Microsoft Teams';
    case 'webex': return 'Webex';
    default: return 'Video Call';
  }
}

export interface CalendarSourceInfo {
  id: string;
  name: string;
  color: string;
  accessRole?: string;
}

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

interface EventDetailDrawerProps {
  isOpen: boolean;
  event: CalendarEvent | null;
  onClose: () => void;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (event: CalendarEvent) => void;
  onEventUpdated?: (updated: CalendarEvent | null) => void;
  onEventDeleted?: (deletedEvent: CalendarEvent) => void;
  calendarSource?: CalendarSourceInfo;
  calendars?: GoogleCalendarListItem[];
  currentUserId?: string;
}

const DESCRIPTION_PREVIEW_LINES = 4;

/** Format date for datetime-local input (local time, not UTC) */
function toDateTimeLocal(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

/** Format date for date input (local date only) */
function toDateOnly(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const EventDetailDrawer: React.FC<EventDetailDrawerProps> = ({
  isOpen,
  event,
  onClose,
  onEdit,
  onDelete,
  onEventUpdated,
  onEventDeleted,
  calendarSource,
  calendars = [],
  currentUserId,
}) => {
  const { showSuccess, showError } = useToast();
  const [copiedLink, setCopiedLink] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [originalData, setOriginalData] = useState<CalendarEvent | null>(null);
  const [eventData, setEventData] = useState<CalendarEvent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [newGuestEmail, setNewGuestEmail] = useState('');
  const [moveToCalendarId, setMoveToCalendarId] = useState<string>('');
  const eventToDeleteRef = useRef<CalendarEvent | null>(null);

  const isReadOnly = calendarSource?.accessRole === 'reader' || calendarSource?.accessRole === 'freeBusyReader';

  useEffect(() => {
    if (event) {
      setOriginalData(event);
      setEventData(event);
      setShowConflictModal(false);
      setMoveToCalendarId('');
      eventToDeleteRef.current = null;
    }
  }, [event?.id, event?.updatedAt]);

  const hasUnsavedChanges =
    isEditing &&
    eventData &&
    originalData &&
    (eventData.title !== originalData.title ||
      eventData.description !== originalData.description ||
      eventData.location !== originalData.location ||
      eventData.start !== originalData.start ||
      eventData.end !== originalData.end ||
      eventData.isAllDay !== originalData.isAllDay);

  const videoInfo = useMemo(() => (eventData ? getVideoLinkAndPlatform(eventData) : null), [eventData]);
  const joinLabel = eventData ? getJoinButtonLabel(eventData) : '';
  const platformLabel = videoInfo ? getPlatformLabel(videoInfo.platform) : '';

  const handleCopyLink = () => {
    if (!videoInfo?.url) return;
    navigator.clipboard.writeText(videoInfo.url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const handleJoin = () => {
    if (videoInfo?.url) window.open(videoInfo.url, '_blank', 'noopener,noreferrer');
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedConfirm(true);
      return;
    }
    onClose();
  };

  const handleSave = async (isRetryAfterConflict = false) => {
    if (!eventData || !currentUserId) return;
    setShowConflictModal(false);
    const payload = {
      title: eventData.title,
      description: eventData.description ?? '',
      start: eventData.start,
      end: eventData.end,
      location: eventData.location ?? '',
      isAllDay: eventData.isAllDay ?? false,
    };

    setIsSyncing(true);
    setSyncStatus('syncing');
    if (!isRetryAfterConflict) onEventUpdated?.(eventData);

    try {
      if (eventData.source === 'google' && eventData.googleEventId) {
        const calendarId = eventData.calendarId || 'primary';
        const res = await apiUpdateGoogleCalendarEvent(currentUserId, calendarId, eventData.googleEventId, {
          summary: payload.title,
          description: payload.description,
          start: payload.start,
          end: payload.end,
          location: payload.location,
          isAllDay: payload.isAllDay,
          attendees: eventData.attendees?.map((a) => (typeof a === 'string' ? { email: a } : { email: a.email })),
          reminders: eventData.reminders?.minutesBefore?.length
            ? { minutesBefore: eventData.reminders.minutesBefore }
            : undefined,
        });
        const data = (res as any)?.data ?? res;
        setOriginalData(data);
        setEventData(data);
        showSuccess('Event updated');
        onEventUpdated?.(data);
      } else {
        const res = await apiUpdateEvent(eventData.id, {
          ...payload,
          type: eventData.type || 'meeting',
          color: eventData.color,
          participants: eventData.participants ?? eventData.attendees?.map((a) => (typeof a === 'string' ? a : a.email)) ?? [],
        });
        const data = (res as any)?.data ?? res;
        const updated = { ...eventData, ...data };
        setOriginalData(updated);
        setEventData(updated);
        showSuccess('Event updated');
        onEventUpdated?.(updated);
      }
      setIsEditing(false);
      setSyncStatus('success');
    } catch (err: any) {
      setSyncStatus('error');
      const status = err?.status ?? err?.response?.status;
      const code = (err as any)?.code ?? (err?.data as any)?.code;
      if (status === 409 || code === 'CONFLICT') {
        setShowConflictModal(true);
        setEventData(originalData);
        onEventUpdated?.(originalData ?? null);
      } else {
        setEventData(originalData);
        onEventUpdated?.(originalData ?? null);
        showError(err?.message ?? 'Failed to save event');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConflictOverwrite = () => {
    setShowConflictModal(false);
    handleSave(true);
  };

  const handleConflictReload = () => {
    setShowConflictModal(false);
    onEventUpdated?.(null);
    onClose();
  };

  const handleDelete = async () => {
    console.log('[EventDetailDrawer] handleDelete called');
    const eventToDelete = eventToDeleteRef.current ?? eventData;
    console.log('[EventDetailDrawer] eventToDelete:', {
      id: eventToDelete?.id,
      source: eventToDelete?.source,
      googleEventId: eventToDelete?.googleEventId,
      calendarId: eventToDelete?.calendarId,
      fullEvent: eventToDelete
    });
    eventToDeleteRef.current = null;

    if (!eventToDelete) {
      console.error('[EventDetailDrawer] No event to delete');
      showError('Event not found');
      return;
    }
    if (!currentUserId) {
      console.error('[EventDetailDrawer] No currentUserId');
      showError('Please sign in to delete events');
      return;
    }
    const googleEventId =
      eventToDelete.googleEventId ??
      (eventToDelete.source === 'google' && eventToDelete.id?.startsWith('gcal_')
        ? eventToDelete.id.replace(/^gcal_/, '')
        : undefined);
    console.log('[EventDetailDrawer] Extracted googleEventId:', googleEventId);
    
    if (eventToDelete.source === 'google' && !googleEventId) {
      console.error('[EventDetailDrawer] Google event but no googleEventId');
      showError('Cannot delete: event ID missing');
      return;
    }

    setIsSyncing(true);
    try {
      if (eventToDelete.source === 'google' && googleEventId) {
        console.log('[EventDetailDrawer] Calling apiDeleteGoogleCalendarEvent', {
          userId: currentUserId,
          calendarId: eventToDelete.calendarId || 'primary',
          eventId: googleEventId
        });
        await apiDeleteGoogleCalendarEvent(
          currentUserId,
          eventToDelete.calendarId || 'primary',
          googleEventId
        );
        console.log('[EventDetailDrawer] apiDeleteGoogleCalendarEvent completed successfully');
      } else {
        console.log('[EventDetailDrawer] Calling apiDeleteEvent', { id: eventToDelete.id });
        await apiDeleteEvent(eventToDelete.id);
        console.log('[EventDetailDrawer] apiDeleteEvent completed successfully');
      }
      showSuccess('Event deleted');
      onEventDeleted?.(eventToDelete);
      onClose();
    } catch (err: any) {
      console.error('[EventDetailDrawer] Delete error:', err);
      const message = err?.message ?? err?.data?.message ?? 'Failed to delete event';
      showError(message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDuplicate = async () => {
    if (!eventData || !currentUserId || eventData.source !== 'google') return;
    const calendarId = eventData.calendarId || 'primary';
    const start = new Date(eventData.start);
    const end = new Date(eventData.end);
    start.setHours(start.getHours() + 1);
    end.setHours(end.getHours() + 1);
    setIsSyncing(true);
    try {
      const res = await apiCreateGoogleCalendarEvent(currentUserId, calendarId, {
        summary: (eventData.title || 'Untitled') + ' (copy)',
        description: eventData.description,
        start: start.toISOString(),
        end: end.toISOString(),
        location: eventData.location,
        isAllDay: eventData.isAllDay,
        attendees: eventData.attendees?.map((a) => ({ email: a.email })),
      });
      const created = (res as any)?.data ?? res;
      showSuccess('Event duplicated');
      onEventUpdated?.(created as CalendarEvent);
      onClose();
    } catch (err: any) {
      showError(err?.message ?? 'Failed to duplicate event');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleMoveToCalendar = async () => {
    if (!eventData || !currentUserId || !moveToCalendarId || eventData.source !== 'google' || !eventData.googleEventId) return;
    const fromCalendarId = eventData.calendarId || 'primary';
    setIsSyncing(true);
    try {
      const res = await apiCreateGoogleCalendarEvent(currentUserId, moveToCalendarId, {
        summary: eventData.title || 'Untitled',
        description: eventData.description,
        start: eventData.start,
        end: eventData.end,
        location: eventData.location,
        isAllDay: eventData.isAllDay,
        attendees: eventData.attendees?.map((a) => ({ email: a.email })),
      });
      const created = (res as any)?.data ?? res;
      await apiDeleteGoogleCalendarEvent(currentUserId, fromCalendarId, eventData.googleEventId);
      showSuccess('Event moved to calendar');
      onEventDeleted?.(eventData);
      onEventUpdated?.(created as CalendarEvent);
      setMoveToCalendarId('');
      onClose();
    } catch (err: any) {
      showError(err?.message ?? 'Failed to move event');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCloseRef = useRef(handleClose);
  const handleSaveRef = useRef(handleSave);
  const handleDeleteRef = useRef(handleDelete);
  handleCloseRef.current = handleClose;
  handleSaveRef.current = handleSave;
  handleDeleteRef.current = handleDelete;

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const target = e.target as HTMLElement;
      const isInputElement = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      if (e.key === 'Escape') { handleCloseRef.current(); return; }
      // Only handle 'e' key if not typing in an input field
      if (e.key === 'e' && !e.ctrlKey && !e.metaKey && !e.altKey && !isInputElement) { e.preventDefault(); if (!isReadOnly) setIsEditing((v) => !v); return; }
      // Only handle shortcuts if not typing in an input field (unless it's a modifier key combo)
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && !isInputElement) { e.preventDefault(); if (hasUnsavedChanges) handleSaveRef.current(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isInputElement) { e.preventDefault(); if (hasUnsavedChanges) handleSaveRef.current().then(() => onClose()); return; }
      if (e.key === 'Delete' && !isInputElement) { e.preventDefault(); handleDeleteRef.current(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isReadOnly, hasUnsavedChanges, onClose]);

  if (!isOpen) return null;
  if (!event) return null;
  const displayEvent = eventData ?? event;

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let dateFormatted = '';
  let timeFormatted = '';
  let durationText = '';

  try {
    const startDate = new Date(displayEvent.start);
    const endDate = new Date(displayEvent.end);
    dateFormatted = startDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (displayEvent.isAllDay) {
      timeFormatted = 'All day';
      const days = Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      durationText = days <= 1 ? 'All day' : `${days} days`;
    } else {
      timeFormatted = `${startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
      const minutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
      if (minutes < 60) durationText = `${minutes} minutes`;
      else if (minutes % 60 === 0) durationText = `${minutes / 60} hour${minutes / 60 !== 1 ? 's' : ''}`;
      else durationText = `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    }
  } catch {
    dateFormatted = displayEvent.start;
    timeFormatted = displayEvent.end;
    durationText = '';
  }

  const status = (displayEvent.status || 'confirmed').toLowerCase();
  const statusBadge =
    status === 'cancelled'
      ? 'bg-red-50 text-red-600 border-red-100'
      : status === 'tentative'
      ? 'bg-amber-50 text-amber-600 border-amber-100'
      : 'bg-emerald-50 text-emerald-600 border-emerald-100';
  const statusLabel = status === 'cancelled' ? 'Cancelled' : status === 'tentative' ? 'Tentative' : 'Confirmed';

  const calSource = calendarSource || {
    id: 'primary',
    name: displayEvent.source === 'google' ? 'Google Calendar' : 'Calendar',
    color: displayEvent.color || '#6366f1',
  };

  const attendees = displayEvent.attendees?.length ? displayEvent.attendees : displayEvent.participants?.map((p) => ({ email: p, responseStatus: undefined })) || [];
  const hasLongDescription = (displayEvent.description || '').split('\n').length > DESCRIPTION_PREVIEW_LINES;
  const showExpand = hasLongDescription && !descriptionExpanded;

  const remindersText =
    displayEvent.reminders?.minutesBefore?.length &&
    displayEvent.reminders.minutesBefore.length > 0
      ? displayEvent.reminders.minutesBefore.map((m) => `${m} min before`).join(', ')
      : null;
  const recurrenceText = displayEvent.recurrence?.length ? (displayEvent.recurrence[0] || '').replace(/^RRULE:/i, '') : null;

  const startForInput = eventData?.start ? toDateTimeLocal(eventData.start) : '';
  const endForInput = eventData?.end ? toDateTimeLocal(eventData.end) : '';

  return (
    <div className="fixed inset-0 z-[110] overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md pointer-events-auto animate-in fade-in duration-300"
        onClick={handleClose}
        aria-hidden
      />
      <div
        className="absolute right-0 inset-y-0 w-full max-w-[480px] bg-white shadow-2xl pointer-events-auto animate-in slide-in-from-right duration-300 ease-out flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-drawer-title"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 relative shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-5 right-5 min-h-[48px] min-w-[48px] flex items-center justify-center p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-all shadow-sm z-10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="pr-10">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${statusBadge}`}>
                {statusLabel}
              </span>
              {isReadOnly && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  Read-only
                </span>
              )}
              <span
                className="flex items-center gap-1.5 text-xs text-slate-500"
                style={{ color: calSource.color }}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: calSource.color }} />
                {calSource.name}
              </span>
            </div>
            {isEditing && eventData ? (
              <input
                id="event-drawer-title"
                value={eventData.title}
                onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
                className="mt-2 w-full text-xl font-bold text-slate-900 bg-white border-2 border-indigo-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="Event title"
              />
            ) : (
              <h2 id="event-drawer-title" className="text-xl font-bold text-slate-900 mt-2 leading-tight">
                {displayEvent.title || 'No title'}
              </h2>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Join Meeting - always visible when video link exists */}
          {videoInfo && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleJoin}
                className="w-full flex items-center justify-center gap-2 min-h-[48px] py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-100 transition-all"
              >
                <Video className="w-5 h-5 shrink-0" />
                {joinLabel} — {platformLabel}
              </button>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 transition-colors"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copiedLink ? 'Copied!' : 'Copy meeting link'}
                </button>
              </div>
            </div>
          )}

          {/* Time & Duration */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Time & duration
            </p>
            {isEditing && eventData ? (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={eventData.isAllDay ?? false}
                    onChange={(e) => setEventData({ ...eventData, isAllDay: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  All day
                </label>
                {!eventData.isAllDay && (
                  <>
                    <div>
                      <label className="text-xs text-slate-500">Start</label>
                      <input
                        type="datetime-local"
                        value={startForInput}
                        onChange={(e) => setEventData({ ...eventData, start: e.target.value ? new Date(e.target.value).toISOString() : eventData.start })}
                        className="w-full mt-0.5 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">End</label>
                      <input
                        type="datetime-local"
                        value={endForInput}
                        onChange={(e) => setEventData({ ...eventData, end: e.target.value ? new Date(e.target.value).toISOString() : eventData.end })}
                        className="w-full mt-0.5 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                  </>
                )}
                {eventData.isAllDay && (
                  <>
                    <div>
                      <label className="text-xs text-slate-500">Start date</label>
                      <input
                        type="date"
                        value={eventData.start ? toDateOnly(eventData.start) : ''}
                        onChange={(e) => {
                          const d = e.target.value;
                          if (!d) return;
                          const start = new Date(d);
                          const end = eventData.end ? new Date(eventData.end) : new Date(start);
                          end.setDate(start.getDate());
                          if (end <= start) end.setDate(start.getDate() + 1);
                          setEventData({ ...eventData, start: start.toISOString(), end: end.toISOString() });
                        }}
                        className="w-full mt-0.5 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">End date</label>
                      <input
                        type="date"
                        value={eventData.end ? toDateOnly(eventData.end) : ''}
                        onChange={(e) => {
                          const d = e.target.value;
                          if (!d) return;
                          setEventData({ ...eventData, end: new Date(d).toISOString() });
                        }}
                        className="w-full mt-0.5 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                  </>
                )}
                <p className="text-[10px] text-slate-400">{timezone}</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-900 font-medium">{dateFormatted}</p>
                <p className="text-sm text-slate-700">{timeFormatted}</p>
                {durationText && <p className="text-xs text-slate-500">{durationText}</p>}
                <p className="text-[10px] text-slate-400">{timezone}</p>
              </>
            )}
          </div>

          {/* People */}
          {(attendees.length > 0 || isEditing) && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <User className="w-3 h-3" /> People
              </p>
              <ul className="space-y-1.5">
                {attendees.map((a, i) => {
                  const email = typeof a === 'string' ? a : a.email;
                  const name = typeof a === 'object' && a.displayName ? a.displayName : email;
                  const res = typeof a === 'object' ? a.responseStatus : undefined;
                  const initial = (name || email).charAt(0).toUpperCase();
                  const rsvpIcon =
                    res === 'accepted' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : res === 'declined' ? <XCircle className="w-3.5 h-3.5 text-red-400" /> : res === 'tentative' ? <HelpCircle className="w-3.5 h-3.5 text-amber-500" /> : null;
                  return (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {initial}
                      </span>
                      <span className="truncate text-slate-900 flex-1 min-w-0">{name || email}</span>
                      {rsvpIcon && <span className="shrink-0">{rsvpIcon}</span>}
                      {isEditing && eventData && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = (eventData.attendees || eventData.participants?.map((p) => ({ email: p })) || []).filter((_, idx) => idx !== i);
                            setEventData({
                              ...eventData,
                              attendees: next.length ? next : undefined,
                              participants: next.map((x) => (typeof x === 'string' ? x : x.email)),
                            });
                          }}
                          className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                          aria-label={`Remove ${email}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              {isEditing && eventData && (
                <div className="flex gap-2 pt-1">
                  <input
                    type="email"
                    value={newGuestEmail}
                    onChange={(e) => setNewGuestEmail(e.target.value)}
                    placeholder="Add guest email"
                    className="flex-1 min-w-0 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const email = newGuestEmail.trim();
                        if (!email) return;
                        const current = eventData.attendees || eventData.participants?.map((p) => ({ email: p })) || [];
                        if (current.some((a) => (typeof a === 'string' ? a : a.email).toLowerCase() === email.toLowerCase())) return;
                        setEventData({
                          ...eventData,
                          attendees: [...current, { email }],
                          participants: [...(eventData.participants || []), email],
                        });
                        setNewGuestEmail('');
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const email = newGuestEmail.trim();
                      if (!email) return;
                      const current = eventData.attendees || eventData.participants?.map((p) => ({ email: p })) || [];
                      if (current.some((a) => (typeof a === 'string' ? a : a.email).toLowerCase() === email.toLowerCase())) {
                        setNewGuestEmail('');
                        return;
                      }
                      setEventData({
                        ...eventData,
                        attendees: [...current, { email }],
                        participants: [...(eventData.participants || []), email],
                      });
                      setNewGuestEmail('');
                    }}
                    className="px-3 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors shrink-0"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Location / Video */}
          {(displayEvent.location || videoInfo?.url || isEditing) && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Location
              </p>
              {isEditing && eventData ? (
                <input
                  type="text"
                  value={eventData.location ?? ''}
                  onChange={(e) => setEventData({ ...eventData, location: e.target.value })}
                  placeholder="Location or video link"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              ) : displayEvent.location ? (
                <p className="text-sm text-slate-700">
                  {displayEvent.location.startsWith('http') ? (
                    <a href={displayEvent.location} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline truncate block">
                      {displayEvent.location}
                    </a>
                  ) : (
                    displayEvent.location
                  )}
                </p>
              ) : videoInfo?.url ? (
                <a href={videoInfo.url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-600 hover:underline truncate block">
                  {videoInfo.url}
                </a>
              ) : null}
            </div>
          )}

          {/* Description */}
          {(displayEvent.description || isEditing) && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <FileText className="w-3 h-3" /> Description
              </p>
              {isEditing && eventData ? (
                <textarea
                  value={eventData.description ?? ''}
                  onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                  placeholder="Description"
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-y"
                />
              ) : displayEvent.description?.includes('<') ? (
                <div
                  className="text-sm text-slate-700 break-words prose prose-sm max-w-none"
                  style={
                    showExpand
                      ? { display: '-webkit-box', WebkitLineClamp: DESCRIPTION_PREVIEW_LINES, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }
                      : undefined
                  }
                  dangerouslySetInnerHTML={{ __html: displayEvent.description }}
                />
              ) : displayEvent.description ? (
                <div
                  className="text-sm text-slate-700 whitespace-pre-wrap break-words"
                  style={
                    showExpand
                      ? { display: '-webkit-box', WebkitLineClamp: DESCRIPTION_PREVIEW_LINES, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }
                      : undefined
                  }
                >
                  {displayEvent.description}
                </div>
              ) : null}
              {!isEditing && hasLongDescription && (
                <button
                  type="button"
                  onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:underline mt-1"
                >
                  {descriptionExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {descriptionExpanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          )}

          {/* Calendar source */}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <CalendarIcon className="w-4 h-4 text-slate-400" />
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: calSource.color }} />
            <span>Calendar: {calSource.name}</span>
          </div>

          {/* Reminders / Recurrence */}
          {(remindersText || recurrenceText) && (
            <div className="space-y-1 text-xs text-slate-500">
              {remindersText && <p>Reminders: {remindersText}</p>}
              {recurrenceText && <p>Repeats: {recurrenceText}</p>}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/30 space-y-2 shrink-0">
          {isEditing ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setIsEditing(false); setEventData(originalData); }}
                disabled={isSyncing}
                className="flex-1 flex items-center justify-center gap-2 min-h-[48px] py-3 px-4 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={isSyncing || !eventData?.title?.trim()}
                className="flex-1 flex items-center justify-center gap-2 min-h-[48px] py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </div>
          ) : (
            <>
              {displayEvent.htmlLink && (
                <a
                  href={displayEvent.htmlLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 min-h-[48px] py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Google Calendar
                </a>
              )}
              {calendars && calendars.length > 1 && !isReadOnly && displayEvent.source === 'google' && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={moveToCalendarId}
                      onChange={(e) => setMoveToCalendarId(e.target.value)}
                      className="flex-1 min-h-[48px] py-2 px-3 border border-slate-200 rounded-xl text-sm text-slate-700 bg-white"
                      aria-label="Move to calendar"
                    >
                      <option value="">Move to calendar...</option>
                      {calendars.filter((c) => c.id !== (displayEvent.calendarId || 'primary')).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.summary}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleMoveToCalendar}
                      disabled={!moveToCalendarId || isSyncing}
                      className="flex items-center justify-center gap-2 min-h-[48px] min-w-[48px] py-3 px-4 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 disabled:opacity-50"
                    >
                      Move
                    </button>
                  </div>
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                {!isReadOnly && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="flex-1 min-w-[48px] flex items-center justify-center gap-2 min-h-[48px] py-3 px-4 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    {displayEvent.source === 'google' && (
                      <button
                        type="button"
                        onClick={handleDuplicate}
                        disabled={isSyncing}
                        className="flex items-center justify-center gap-2 min-h-[48px] min-w-[48px] py-3 px-4 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
                        title="Duplicate event"
                      >
                        <Copy className="w-4 h-4" />
                        Duplicate
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (eventData) {
                          eventToDeleteRef.current = eventData;
                        }
                        handleDelete();
                      }}
                      disabled={isSyncing}
                      className="flex items-center justify-center gap-2 min-h-[48px] min-w-[48px] py-3 px-4 border border-red-200 text-red-600 font-medium rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      Delete
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Conflict modal */}
      {showConflictModal && (
        <div className="absolute inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <p className="text-slate-800 font-medium">This event was changed elsewhere. Overwrite with your version or reload the latest?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConflictReload}
                className="flex-1 min-h-[48px] py-3 px-4 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50"
              >
                Reload
              </button>
              <button
                type="button"
                onClick={handleConflictOverwrite}
                disabled={isSyncing}
                className="flex-1 min-h-[48px] py-3 px-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
              >
                Overwrite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved changes confirm */}
      {showUnsavedConfirm && (
        <div className="absolute inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
            <p className="text-slate-800 font-medium">Discard unsaved changes?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowUnsavedConfirm(false); onClose(); }}
                className="flex-1 min-h-[48px] py-3 px-4 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => setShowUnsavedConfirm(false)}
                className="flex-1 min-h-[48px] py-3 px-4 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700"
              >
                Keep editing
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EventDetailDrawer;
