
import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Tag, AlignLeft, Check, Loader2 } from 'lucide-react';
import { CalendarEvent } from '../types';
import { apiCreateEvent, apiUpdateEvent } from '../utils/api';
import { useToast } from '../contexts/ToastContext';

interface EventModalProps {
  event: CalendarEvent | null;
  selectedDate?: Date;
  onClose: () => void;
  onSuccess: () => void;
}

const EventModal: React.FC<EventModalProps> = ({ event, selectedDate, onClose, onSuccess }) => {
  const { showSuccess, showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    type: 'meeting' as CalendarEvent['type'],
    color: '#4f46e5'
  });

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description || '',
        start: event.start.substring(0, 16),
        end: event.end.substring(0, 16),
        type: event.type,
        color: event.color || '#4f46e5'
      });
    } else if (selectedDate) {
      const start = new Date(selectedDate);
      start.setHours(9, 0, 0, 0);
      const end = new Date(selectedDate);
      end.setHours(10, 0, 0, 0);
      
      setFormData(prev => ({
        ...prev,
        start: start.toISOString().substring(0, 16),
        end: end.toISOString().substring(0, 16)
      }));
    }
  }, [event, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (event) {
        await apiUpdateEvent(event.id, formData);
        showSuccess('Event updated successfully');
      } else {
        await apiCreateEvent({
          ...formData,
          source: 'local'
        });
        showSuccess('Event created successfully');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      showError(err.message || 'Failed to save event');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-100">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{event ? 'Edit Event' : 'New Entry'}</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Workspace Schedule</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors shadow-sm border border-transparent hover:border-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Event Title</label>
            <input 
              required
              type="text" 
              placeholder="e.g. Project Sync w/ Client"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Start
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
                <Clock className="w-3 h-3" /> End
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
              <Tag className="w-3 h-3" /> Event Type
            </label>
            <div className="flex flex-wrap gap-2">
              {['meeting', 'task', 'deadline', 'reminder'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: t as any })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                    formData.type === t 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' 
                      : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-1.5">
              <AlignLeft className="w-3 h-3" /> Description
            </label>
            <textarea 
              placeholder="Add details, notes, or agenda..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-colors border border-transparent hover:border-slate-200"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-[2] py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {event ? 'Save Changes' : 'Create Entry'}
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