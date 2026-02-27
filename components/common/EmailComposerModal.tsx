/**
 * Phase 5: EmailComposerModal Component
 * Modal for composing emails (simplified - full implementation would integrate with inbox)
 */

import React, { useState } from 'react';
import { X, Mail, Send, Loader2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface EmailComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  toEmail?: string;
  toName?: string;
  onSuccess?: () => void;
}

const EmailComposerModal: React.FC<EmailComposerModalProps> = ({
  isOpen,
  onClose,
  toEmail,
  toName,
  onSuccess
}) => {
  const { showSuccess, showError } = useToast();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !body.trim()) {
      showError('Subject and body are required');
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: Integrate with actual email sending API
      // For now, just show success and navigate to inbox
      showSuccess('Email draft created. Please use the Inbox to send emails.');
      setSubject('');
      setBody('');
      onSuccess?.();
      onClose();
      
      // Optionally navigate to inbox
      // window.location.href = '/?tab=inbox';
    } catch (err: any) {
      showError(err.message || 'Failed to create email draft');
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
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">Compose Email</h2>
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
                To
              </label>
              <input
                type="email"
                value={toEmail || ''}
                readOnly
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-600"
              />
              {toName && (
                <p className="text-xs text-slate-500 mt-1">{toName}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Message
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type your message..."
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 min-h-[200px]"
                rows={8}
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
              disabled={isSubmitting || !subject.trim() || !body.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Email
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmailComposerModal;
