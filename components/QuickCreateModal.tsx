
import React, { useState } from 'react';
import { X, CheckCircle2, Building2, FolderKanban, CheckSquare, FileText, Plus, ChevronRight, User } from 'lucide-react';
import { MOCK_COMPANIES, MOCK_PROJECTS, MOCK_USERS } from '../constants';

interface QuickCreateModalProps {
  type: 'deal' | 'project' | 'task' | 'invoice' | 'company' | 'contact';
  onClose: () => void;
}

const QuickCreateModal: React.FC<QuickCreateModalProps> = ({ type: initialType, onClose }) => {
  const [type, setType] = useState(initialType);
  const [step, setStep] = useState<'form' | 'success'>('form');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('success');
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const getTitle = () => {
    switch(type) {
      case 'deal': return 'New Opportunity';
      case 'project': return 'Create Project';
      case 'task': return 'New Task';
      case 'invoice': return 'Create Invoice';
      case 'company': return 'Add Company';
      case 'contact': return 'Add Contact';
      default: return 'Quick Create';
    }
  };

  if (step === 'success') {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
        <div className="bg-white rounded-2xl w-full max-w-sm p-12 text-center animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Successfully Created!</h3>
          <p className="text-sm text-slate-500">Your {type} has been added to the ImpactFlow workspace.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              {type === 'deal' && <Building2 className="w-5 h-5" />}
              {type === 'project' && <FolderKanban className="w-5 h-5" />}
              {type === 'task' && <CheckSquare className="w-5 h-5" />}
              {type === 'invoice' && <FileText className="w-5 h-5" />}
              {type === 'company' && <Building2 className="w-5 h-5" />}
              {type === 'contact' && <User className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{getTitle()}</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">New ImpactFlow Entry</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors shadow-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Quick Switch Tabs if not from a specific button */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-4 overflow-x-auto scrollbar-hide">
            {[
              { id: 'deal', icon: <Building2 className="w-3.5 h-3.5" />, label: 'Deal' },
              { id: 'project', icon: <FolderKanban className="w-3.5 h-3.5" />, label: 'Project' },
              { id: 'task', icon: <CheckSquare className="w-3.5 h-3.5" />, label: 'Task' },
              { id: 'invoice', icon: <FileText className="w-3.5 h-3.5" />, label: 'Invoice' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setType(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap px-4 ${
                  type === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Common Name Field */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {type === 'deal' || type === 'project' || type === 'task' ? 'Title / Name' : type === 'company' ? 'Company Name' : 'Full Name'}
              </label>
              <input required type="text" placeholder={`Enter ${type} title...`} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
            </div>

            {/* Entity Specific Fields */}
            {(type === 'deal' || type === 'project' || type === 'invoice' || type === 'contact') && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Company</label>
                <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100">
                  {MOCK_COMPANIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            {type === 'task' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Link to Project</label>
                <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100">
                  {MOCK_PROJECTS.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
            )}

            {type === 'deal' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expected Value</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input type="number" placeholder="0.00" className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
                </div>
              </div>
            )}

            {type === 'invoice' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount Due</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input required type="number" placeholder="0.00" className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
                </div>
              </div>
            )}

            {type === 'task' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Priority</label>
                <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100">
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
            )}

            {(type === 'deal' || type === 'task' || type === 'invoice') && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Due Date</label>
                <input required type="date" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assignee</label>
              <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100">
                {MOCK_USERS.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Internal Description / Notes</label>
            <textarea placeholder="Add any relevant details..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none resize-none h-24" />
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-[2] py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Create {type}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickCreateModal;
