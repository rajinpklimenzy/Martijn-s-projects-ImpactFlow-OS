import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, User, Loader2, Check, Users, AlertCircle } from 'lucide-react';
import { apiCreateCalendarEvent, apiGetCalendarAvailability } from '../utils/api';
import { useToast } from '../contexts/ToastContext';

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  emailId?: string;
  emailSubject?: string;
  emailBody?: string;
  participants?: string[];
  extractedDetails?: {
    title?: string;
    date?: string;
    time?: string;
    location?: string;
    participants?: string[];
    description?: string;
  };
  onCreateSuccess?: () => void;
}

const ScheduleMeetingModal: React.FC<ScheduleMeetingModalProps> = ({
  isOpen,
  onClose,
  userId,
  emailId,
  emailSubject,
  emailBody,
  participants = [],
  extractedDetails,
  onCreateSuccess
}) => {
  const { showSuccess, showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availability, setAvailability] = useState<any[]>([]);
  const [showAvailability, setShowAvailability] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    location: '',
    participants: [] as string[],
    createInGoogleCalendar: true
  });

  // Initialize form with extracted details or defaults
  useEffect(() => {
    if (!isOpen) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const endTime = new Date(tomorrow);
    endTime.setHours(11, 0, 0, 0);

    let initialStart = tomorrow.toISOString().substring(0, 16);
    let initialEnd = endTime.toISOString().substring(0, 16);

    // Try to parse extracted date/time
    if (extractedDetails?.date || extractedDetails?.time) {
      try {
        const dateStr = extractedDetails.date || 'tomorrow';
        const timeStr = extractedDetails.time || '10:00 AM';
        
        // Simple date parsing
        let parsedDate = new Date();
        if (dateStr.toLowerCase().includes('tomorrow')) {
          parsedDate.setDate(parsedDate.getDate() + 1);
        } else if (dateStr.toLowerCase().includes('today')) {
          // Use today
        } else {
          // Try to parse date string
          const dateMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
          if (dateMatch) {
            const [, month, day, year] = dateMatch;
            parsedDate = new Date(parseInt(year) < 100 ? 2000 + parseInt(year) : parseInt(year), parseInt(month) - 1, parseInt(day));
          }
        }

        // Parse time
        const timeMatch = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
          const ampm = timeMatch[3]?.toLowerCase();

          if (ampm === 'pm' && hours !== 12) hours += 12;
          if (ampm === 'am' && hours === 12) hours = 0;

          parsedDate.setHours(hours, minutes, 0, 0);
          initialStart = parsedDate.toISOString().substring(0, 16);
          
          const endDate = new Date(parsedDate);
          endDate.setHours(endDate.getHours() + 1);
          initialEnd = endDate.toISOString().substring(0, 16);
        }
      } catch (err) {
        console.warn('Failed to parse extracted date/time:', err);
      }
    }

    setFormData({
      title: extractedDetails?.title || emailSubject || 'Meeting',
      description: extractedDetails?.description || emailBody?.substring(0, 500) || '',
      start: initialStart,
      end: initialEnd,
      location: extractedDetails?.location || '',
      participants: extractedDetails?.participants || participants || [],
      createInGoogleCalendar: true
    });
  }, [isOpen, extractedDetails, emailSubject, emailBody, participants]);

  const handleCheckAvailability = async () => {
    if (!formData.start || !formData.end || formData.participants.length === 0) {
      showError('Please set date/time and add participants to check availability');
      return;
    }

    setCheckingAvailability(true);
    try {
      const startDate = new Date(formData.start).toISOString().split('T')[0];
      const endDate = new Date(formData.end).toISOString().split('T')[0];
      
      const res = await apiGetCalendarAvailability(userId, formData.participants, startDate, endDate);
      if (res.success && res.data) {
        setAvailability(res.data);
        setShowAvailability(true);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to check availability');
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.start || !formData.end) {
      showError('Please fill in all required fields');
      return;
    }

    if (!emailId) {
      showError('Email ID is required to create meeting');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiCreateCalendarEvent({
        userId,
        emailId,
        title: formData.title,
        description: formData.description,
        start: new Date(formData.start).toISOString(),
        end: new Date(formData.end).toISOString(),
        location: formData.location,
        participants: formData.participants,
        createInGoogleCalendar: formData.createInGoogleCalendar
      });

      if (res.success) {
        showSuccess('Meeting created successfully!');
        onCreateSuccess?.();
        onClose();
      }
    } catch (err: any) {
      showError(err.message || 'Failed to create meeting');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-100">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Schedule Meeting</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">From Email</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors shadow-sm border border-transparent hover:border-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {extractedDetails && (extractedDetails.date || extractedDetails.time || extractedDetails.location) && (
            <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-indigo-900 mb-1">Extracted Meeting Details</p>
                  <div className="text-xs text-indigo-700 space-y-0.5">
                    {extractedDetails.date && <p>Date: {extractedDetails.date}</p>}
                    {extractedDetails.time && <p>Time: {extractedDetails.time}</p>}
                    {extractedDetails.location && <p>Location: {extractedDetails.location}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Meeting Title *</label>
              <input 
                required
                type="text" 
                placeholder="e.g. Project Sync Meeting"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Start Time *
                </label>
                <input 
                  required
                  type="datetime-local"
                  value={formData.start}
                  onChange={e => setFormData({ ...formData, start: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> End Time *
                </label>
                <input 
                  required
                  type="datetime-local"
                  value={formData.end}
                  onChange={e => setFormData({ ...formData, end: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Location
              </label>
              <input 
                type="text" 
                placeholder="e.g. Conference Room A, Zoom, Google Meet"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                  <Users className="w-3 h-3" /> Participants
                </label>
                {formData.participants.length > 0 && (
                  <button
                    type="button"
                    onClick={handleCheckAvailability}
                    disabled={checkingAvailability || !formData.start || !formData.end}
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {checkingAvailability ? 'Checking...' : 'Check Availability'}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl min-h-[50px]">
                {formData.participants.map((email, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-lg"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        participants: formData.participants.filter((_, i) => i !== idx)
                      })}
                      className="hover:text-indigo-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="email"
                  placeholder="Add participant email..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      e.preventDefault();
                      const email = e.currentTarget.value.trim();
                      if (!formData.participants.includes(email)) {
                        setFormData({
                          ...formData,
                          participants: [...formData.participants, email]
                        });
                      }
                      e.currentTarget.value = '';
                    }
                  }}
                  className="flex-1 min-w-[200px] bg-transparent border-none outline-none text-sm"
                />
              </div>
            </div>

            {showAvailability && availability.length > 0 && (
              <div className="space-y-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs font-semibold text-amber-900">Team Availability</p>
                {availability.map((member: any, idx: number) => (
                  <div key={idx} className="text-xs text-amber-800">
                    <p className="font-medium">{member.userId}</p>
                    {member.busySlots && member.busySlots.length > 0 ? (
                      <p className="text-amber-700 mt-0.5">
                        Busy: {member.busySlots.length} conflict(s)
                      </p>
                    ) : (
                      <p className="text-emerald-700 mt-0.5">Available</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Description</label>
              <textarea 
                placeholder="Meeting agenda, notes, or details..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
              <input
                type="checkbox"
                id="createInGoogleCalendar"
                checked={formData.createInGoogleCalendar}
                onChange={e => setFormData({ ...formData, createInGoogleCalendar: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <label htmlFor="createInGoogleCalendar" className="text-sm text-slate-700 cursor-pointer">
                Create in Google Calendar
              </label>
            </div>
          </form>
        </div>

        <div className="flex gap-3 p-6 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
          <button 
            type="button" 
            onClick={onClose}
            className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-white rounded-2xl transition-colors border border-slate-200"
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.title || !formData.start || !formData.end || !emailId}
            className="flex-[2] py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Create Meeting
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleMeetingModal;
