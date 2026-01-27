
import React, { useState } from 'react';
import { Bug, Send, X, Sparkles, MessageSquare, Lightbulb, Loader2, CheckCircle2 } from 'lucide-react';
import { apiCreateFeedback } from '../utils/api';
import { useToast } from '../contexts/ToastContext';

const BugReportWidget: React.FC<{ currentUser: any }> = ({ currentUser }) => {
  const { showSuccess, showError } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    type: 'bug' as 'bug' | 'feature' | 'idea',
    title: '',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        userId: currentUser?.id || 'anonymous',
        status: 'planned'
      };
      
      await apiCreateFeedback(payload);
      
      setIsSuccess(true);
      showSuccess('Integrated into Roadmap');
      
      // Dispatch event to refresh roadmap
      window.dispatchEvent(new Event('refresh-roadmap'));
      
      setTimeout(() => {
        setIsSuccess(false);
        setIsOpen(false);
        setFormData({ type: 'bug', title: '', description: '' });
      }, 2000);
    } catch (err: any) {
      console.error('[FEEDBACK] Submission failed:', err);
      showError(`Submission error: ${err.message || 'Registry error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-[100] flex items-center pointer-events-none">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`pointer-events-auto h-32 w-10 bg-slate-900 text-white flex flex-col items-center justify-center rounded-l-2xl shadow-2xl transition-all duration-300 hover:w-12 group border-l border-y border-white/10 ${isOpen ? 'translate-x-full' : ''}`}
      >
        <span className="[writing-mode:vertical-lr] text-[11px] font-black uppercase tracking-[0.3em] rotate-180">Feedback</span>
      </button>

      <div className={`pointer-events-auto fixed right-0 top-1/2 -translate-y-1/2 w-[90vw] sm:w-80 bg-white shadow-[-20px_0_60px_rgba(0,0,0,0.15)] rounded-l-[32px] border-l border-slate-100 transition-all duration-500 ease-out transform overflow-hidden ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {isSuccess ? (
          <div className="p-10 text-center animate-in zoom-in-95 duration-300">
             <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10" />
             </div>
             <h3 className="text-xl font-black text-slate-900 mb-2">Submitted</h3>
             <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Entry Stored Successfully</p>
          </div>
        ) : (
          <div className="flex flex-col h-full max-h-[80vh]">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-indigo-600 rounded-xl text-white">
                   <MessageSquare className="w-4 h-4" />
                 </div>
                 <div>
                   <h3 className="text-sm font-black text-slate-900">Feedback Hub</h3>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-0.5">Community Input</p>
                 </div>
               </div>
               <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white rounded-full text-slate-400 transition-all"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Classification</label>
                <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                  {[
                    { id: 'bug', icon: <Bug className="w-3 h-3" />, label: 'Bug' },
                    { id: 'feature', icon: <Sparkles className="w-3 h-3" />, label: 'Feature' },
                    { id: 'idea', icon: <Lightbulb className="w-3 h-3" />, label: 'Idea' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFormData({...formData, type: tab.id as any})}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${formData.type === tab.id ? 'bg-white text-indigo-600 shadow-md border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Title</label>
                <input 
                  required
                  type="text"
                  placeholder="Summary..."
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Context</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Provide details..."
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[20px] text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-50 resize-none"
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-slate-900 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send Feedback
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default BugReportWidget;
