
import React, { useState } from 'react';
import { MOCK_AUTOMATIONS } from '../constants.tsx';
import { Zap, Play, Settings2, Trash2, Plus, ArrowRight, Sparkles, X, Check, Loader2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext.tsx';
import { AutomationRule } from '../types.ts';

const Automations: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [rules, setRules] = useState<AutomationRule[]>(MOCK_AUTOMATIONS);
  const [isCreating, setIsCreating] = useState(false);
  const [newRule, setNewRule] = useState({ name: '', trigger: '', action: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
    const rule = rules.find(r => r.id === id);
    showSuccess(`Automation "${rule?.name}" ${!rule?.active ? 'activated' : 'deactivated'}.`);
  };

  const deleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    showSuccess('Automation rule removed.');
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    setTimeout(() => {
      const rule: AutomationRule = {
        id: `a${Date.now()}`,
        name: newRule.name,
        trigger: newRule.trigger,
        action: newRule.action,
        active: true,
        description: newRule.description
      };
      
      setRules([rule, ...rules]);
      setIsSubmitting(false);
      setIsCreating(false);
      setNewRule({ name: '', trigger: '', action: '', description: '' });
      showSuccess('Automation recipe created successfully!');
    }, 800);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Logistics Automations</h1>
          <p className="text-slate-500 text-sm font-medium">Event-driven workflows and smart triggers</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
        >
          <Plus className="w-4 h-4" /> Create Recipe
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {rules.map(rule => (
          <div key={rule.id} className="bg-white rounded-3xl border border-slate-200 p-6 lg:p-8 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 group">
            <div className="flex items-center gap-6">
              <div 
                onClick={() => toggleRule(rule.id)}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center cursor-pointer transition-all active:scale-90 ${rule.active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-slate-100 text-slate-400'}`}
              >
                <Zap className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-bold text-slate-900">{rule.name}</h3>
                  {rule.active && (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-tighter">
                      <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" /> Running
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-xl">{rule.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden sm:flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Trigger</p>
                  <p className="text-xs font-bold text-slate-700">{rule.trigger}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300" />
                <div className="text-left">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Action</p>
                  <p className="text-xs font-bold text-indigo-600">{rule.action}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => toggleRule(rule.id)}
                  className={`p-3 rounded-xl transition-all ${rule.active ? 'text-indigo-600 hover:bg-indigo-50' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  <Play className={`w-5 h-5 ${rule.active ? 'fill-indigo-600' : ''}`} />
                </button>
                <button 
                  onClick={() => deleteRule(rule.id)}
                  className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        <div className="bg-slate-900 rounded-3xl p-8 lg:p-12 text-white relative overflow-hidden group shadow-2xl">
          <div className="relative z-10 max-w-2xl text-left">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
                <Sparkles className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-2xl font-bold">Impact AI Copilot</h3>
            </div>
            <h2 className="text-3xl font-black mb-4 tracking-tight leading-tight">Describe the automation you need, and we'll build it.</h2>
            <p className="text-slate-400 text-base font-medium mb-8 italic">"When a deal is won, create a project workspace and notify the logistics team."</p>
            <div className="flex gap-4">
              <input type="text" placeholder="I want to automate..." className="flex-1 bg-white/10 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/50" />
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-indigo-900 transition-all active:scale-95 flex items-center gap-2">
                Generate <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-1/3 h-full bg-indigo-600/10 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {isCreating && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">New Automation Recipe</h3>
              <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateRule} className="p-6 space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recipe Name</label>
                <input 
                  required 
                  type="text" 
                  value={newRule.name} 
                  onChange={e => setNewRule({...newRule, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none" 
                  placeholder="e.g., Lead Auto-Reply"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trigger Event</label>
                <input 
                  required 
                  type="text" 
                  value={newRule.trigger} 
                  onChange={e => setNewRule({...newRule, trigger: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none" 
                  placeholder="e.g., New Contact Created"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Automation Action</label>
                <input 
                  required 
                  type="text" 
                  value={newRule.action} 
                  onChange={e => setNewRule({...newRule, action: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none" 
                  placeholder="e.g., Send Welcome Template"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</label>
                <textarea 
                  required 
                  value={newRule.description} 
                  onChange={e => setNewRule({...newRule, description: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none resize-none" 
                  rows={3}
                  placeholder="Briefly explain what this does..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Deploy Automation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Automations;
