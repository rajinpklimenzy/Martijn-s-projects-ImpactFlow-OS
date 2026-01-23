
import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Users, FileText, Tag, Save, Loader2, AlertCircle } from 'lucide-react';
import { CalendarEvent } from '../types';
import { apiCreateEvent, apiUpdateEvent } from '../utils/api';

interface EventModalProps {
  event?: CalendarEvent | null;
  selectedDate?: Date;
  onClose: () => void;
  onSuccess?: () => void;
}

const EventModal: React.FC<EventModalProps> = ({ event, selectedDate, onClose, onSuccess }) => {
  const isEditMode = !!event;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState(event?.title || '');
  const [description, setDescription] = useState(event?.description || '');
  const [startDate, setStartDate] = useState(() => {
    if (event?.start) {
      const date = new Date(event.start);
      return date.toISOString().slice(0, 16);
    }
    if (selectedDate) {
      const date = new Date(selectedDate);
      date.setHours(9, 0, 0, 0);
      return date.toISOString().slice(0, 16);
    }
    const now = new Date();
    now.setMinutes(0);
    return now.toISOString().slice(0, 16);
  });
  const [endDate, setEndDate] = useState(() => {
    if (event?.end) {
      const date = new Date(event.end);
      return date.toISOString().slice(0, 16);
    }
    if (selectedDate) {
      const date = new Date(selectedDate);
      date.setHours(10, 0, 0, 0);
      return date.toISOString().slice(0, 16);
    }
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
    return now.toISOString().slice(0, 16);
  });
  const [type, setType] = useState<CalendarEvent['type']>(event?.type || 'meeting');
  const [location, setLocation] = useState(event?.location || '');
  const [participants, setParticipants] = useState<string>(event?.participants?.join(', ') || '');
  const [isAllDay, setIsAllDay] = useState(event?.isAllDay || false);

  // Event types
  const eventTypes: { value: CalendarEvent['type']; label: string; color: string }[] = [
    { value: 'meeting', label: 'Meeting', color: 'bg-indigo-500' },
    { value: 'task', label: 'Task', color: 'bg-emerald-500' },
    { value: 'deadline', label: 'Deadline', color: 'bg-red-500' },
    { value: 'reminder', label: 'Reminder', color: 'bg-yellow-500' },
    { value: 'custom', label: 'Custom', color: 'bg-purple-500' }
  ];

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setError('Invalid date format');
      return;
    }

    if (start >= end) {
      setError('End time must be after start time');
      return;
    }

    setLoading(true);

    try {
      const eventData: Partial<CalendarEvent> = {
        title: title.trim(),
        description: description.trim() || undefined,
        start: start.toISOString(),
        end: end.toISOString(),
        type,
        location: location.trim() || undefined,
        participants: participants.split(',').map(p => p.trim()).filter(p => p.length > 0),
        isAllDay
      };

      if (isEditMode && event) {
        await apiUpdateEvent(event.id, eventData);
      } else {
        await apiCreateEvent(eventData);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  // Update end date when start date changes (if end is before start)
  useEffect(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      const newEnd = new Date(start);
      newEnd.setHours(newEnd.getHours() + 1);
      setEndDate(newEnd.toISOString().slice(0, 16));
    }
  }, [startDate]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {isEditMode ? 'Edit Event' : 'Create New Event'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {isEditMode ? 'Update event details' : 'Schedule a new calendar event'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Event Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Team Meeting, Project Deadline"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                required
                disabled={loading}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add event details, agenda, or notes..."
                rows={4}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                disabled={loading}
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Start Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  required
                  disabled={loading || isAllDay}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  End Date & Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  required
                  disabled={loading || isAllDay}
                />
              </div>
            </div>

            {/* All Day Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="allDay"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                disabled={loading}
              />
              <label htmlFor="allDay" className="text-sm font-medium text-slate-700 cursor-pointer">
                All-day event
              </label>
            </div>

            {/* Event Type */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Event Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-5 gap-2">
                {eventTypes.map((et) => (
                  <button
                    key={et.value}
                    type="button"
                    onClick={() => setType(et.value)}
                    className={`px-4 py-3 rounded-xl border-2 transition-all font-semibold text-sm ${
                      type === et.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                    disabled={loading}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${et.color}`} />
                      {et.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Conference Room A, Zoom, Office"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                disabled={loading}
              />
            </div>

            {/* Participants */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Participants
              </label>
              <input
                type="text"
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                placeholder="Enter email addresses separated by commas"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                disabled={loading}
              />
              <p className="text-xs text-slate-500 mt-1">
                Separate multiple participants with commas
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-slate-700 font-semibold rounded-xl hover:bg-slate-100 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isEditMode ? 'Update Event' : 'Create Event'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal;
