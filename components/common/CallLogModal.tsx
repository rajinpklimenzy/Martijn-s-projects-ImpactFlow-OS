/**
 * Phase 5: CallLogModal Component
 * Modal for logging calls
 */

import React, { useState } from 'react';
import { X, Phone, Loader2, Clock } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { apiCreateTask } from '../../utils/api';

interface CallLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'contact' | 'company';
  entityId: string;
  entityName: string;
  phoneNumber?: string;
  onSuccess?: () => void;
}

const CallLogModal: React.FC<CallLogModalProps> = ({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityName,
  phoneNumber,
  onSuccess
}) => {
  const { showSuccess, showError } = useToast();
  const [callNotes, setCallNotes] = useState('');
  const [callDuration, setCallDuration] = useState('');
  const [callOutcome, setCallOutcome] = useState<'connected' | 'voicemail' | 'no_answer' | 'busy'>('connected');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}');
      
      // Create a task to log the call
      await apiCreateTask({
        title: `Call with ${entityName}`,
        description: `Call logged: ${callOutcome}\n${callDuration ? `Duration: ${callDuration}\n` : ''}${callNotes}`,
        status: 'Done',
        priority: 'Medium',
        assigneeId: currentUser.id,
        category: 'Call Log'
      });

      showSuccess('Call logged successfully');
      setCallNotes('');
      setCallDuration('');
      setCallOutcome('connected');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      showError(err.message || 'Failed to log call');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">Log Call</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Contact
              </label>
              <p className="text-sm text-slate-900">{entityName}</p>
              {phoneNumber && (
                <p className="text-xs text-slate-500 mt-1">{phoneNumber}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Call Outcome
              </label>
              <select
                value={callOutcome}
                onChange={(e) => setCallOutcome(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="connected">Connected</option>
                <option value="voicemail">Voicemail</option>
                <option value="no_answer">No Answer</option>
                <option value="busy">Busy</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Duration (optional)
              </label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={callDuration}
                  onChange={(e) => setCallDuration(e.target.value)}
                  placeholder="e.g., 5 minutes"
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notes
              </label>
              <textarea
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                placeholder="Add notes about the call..."
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 min-h-[100px]"
                rows={4}
              />
            </div>
          </div>
          
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Logging...
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4" />
                  Log Call
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CallLogModal;
