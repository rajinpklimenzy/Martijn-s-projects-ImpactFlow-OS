
import React, { useState, useEffect } from 'react';
import { Zap, Play, Settings2, Trash2, Plus, ArrowRight, Sparkles, X, Check, Loader2, AlertTriangle, Pause } from 'lucide-react';
import { useToast } from '../contexts/ToastContext.tsx';
import { AutomationRule } from '../types.ts';
import { apiGetAutomations, apiCreateAutomation, apiToggleAutomation, apiDeleteAutomation } from '../utils/api';

const Automations: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newRule, setNewRule] = useState({ name: '', trigger: '', action: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isToggling, setIsToggling] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<string | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<AutomationRule | null>(null);

  // Fetch automations
  useEffect(() => {
    const fetchAutomations = async () => {
      setIsLoading(true);
      try {
        const userId = JSON.parse(localStorage.getItem('user_data') || '{}').id;
        const response = await apiGetAutomations(userId);
        const fetchedRules = response?.data || response || [];
        setRules(Array.isArray(fetchedRules) ? fetchedRules : []);
      } catch (err: any) {
        console.error('[AUTOMATIONS] Failed to fetch automations:', err);
        showError(err.message || 'Failed to load automations');
        setRules([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAutomations();
  }, []);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = async () => {
      const userId = JSON.parse(localStorage.getItem('user_data') || '{}').id;
      try {
        const response = await apiGetAutomations(userId);
        const fetchedRules = response?.data || response || [];
        setRules(Array.isArray(fetchedRules) ? fetchedRules : []);
      } catch (err) {
        console.error('Failed to refresh automations:', err);
      }
    };

    window.addEventListener('refresh-automations', handleRefresh);
    return () => window.removeEventListener('refresh-automations', handleRefresh);
  }, []);

  const toggleRule = async (id: string) => {
    setIsToggling(id);
    try {
      await apiToggleAutomation(id);
      const rule = rules.find(r => r.id === id);
      setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
      showSuccess(`Automation "${rule?.name}" ${rule?.active ? 'deactivated' : 'activated'}.`);
      window.dispatchEvent(new Event('refresh-automations'));
    } catch (err: any) {
      console.error('Failed to toggle automation:', err);
      showError(err.message || 'Failed to toggle automation');
    } finally {
      setIsToggling(null);
    }
  };

  const handleDeleteClick = (rule: AutomationRule) => {
    setRuleToDelete(rule);
    setDeleteConfirmOpen(rule.id);
  };

  const deleteRule = async () => {
    if (!ruleToDelete) return;

    setIsDeleting(ruleToDelete.id);
    try {
      await apiDeleteAutomation(ruleToDelete.id);
      setRules(prev => prev.filter(r => r.id !== ruleToDelete.id));
      setDeleteConfirmOpen(null);
      setRuleToDelete(null);
      showSuccess('Automation rule removed.');
      window.dispatchEvent(new Event('refresh-automations'));
    } catch (err: any) {
      console.error('Failed to delete automation:', err);
      showError(err.message || 'Failed to delete automation');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const userId = JSON.parse(localStorage.getItem('user_data') || '{}').id;
      await apiCreateAutomation({
        name: newRule.name,
        trigger: newRule.trigger,
        action: newRule.action,
        description: newRule.description,
        active: true,
        userId: userId || undefined
      });
      
      setIsSubmitting(false);
      setIsCreating(false);
      setNewRule({ name: '', trigger: '', action: '', description: '' });
      showSuccess('Automation recipe created successfully!');
      window.dispatchEvent(new Event('refresh-automations'));
    } catch (err: any) {
      console.error('Failed to create automation:', err);
      showError(err.message || 'Failed to create automation');
      setIsSubmitting(false);
    }
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

      {isLoading ? (
        <div className="flex items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
          <p className="text-slate-500 text-sm">Loading automations...</p>
        </div>
      ) : rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-slate-300 rounded-2xl text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
            <Zap className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">No Automations Found</h3>
          <p className="text-slate-500 text-sm mb-6">Get started by creating your first automation recipe.</p>
          <button 
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Your First Automation
          </button>
        </div>
      ) : (
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
                    disabled={isToggling === rule.id}
                    className={`p-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${rule.active ? 'text-indigo-600 hover:bg-indigo-50' : 'text-slate-400 hover:bg-slate-50'}`}
                    title={rule.active ? 'Pause Automation' : 'Activate Automation'}
                  >
                    {isToggling === rule.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : rule.active ? (
                      <Pause className="w-5 h-5 fill-indigo-600" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </button>
                  <button 
                    onClick={() => handleDeleteClick(rule)}
                    disabled={isDeleting === rule.id}
                    className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete Automation"
                  >
                    {isDeleting === rule.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
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
      )}

      {/* Create Automation Modal */}
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
                <button type="submit" disabled={isSubmitting} className="flex-[2] py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Deploy Automation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && ruleToDelete && (
        <div className="fixed inset-0 z-[110] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300" onClick={() => setDeleteConfirmOpen(null)} />
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl pointer-events-auto animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Delete Automation</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">This action cannot be undone</p>
                  </div>
                </div>
                <button onClick={() => setDeleteConfirmOpen(null)} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors shadow-sm">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600">
                  Are you sure you want to delete automation <span className="font-bold text-slate-900">"{ruleToDelete.name}"</span>?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-xs text-red-700 font-semibold mb-1">⚠️ Warning:</p>
                  <p className="text-xs text-red-600">
                    This will permanently delete the automation rule and all its configurations. This action cannot be undone.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setDeleteConfirmOpen(null)}
                    disabled={isDeleting === ruleToDelete.id}
                    className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={deleteRule}
                    disabled={isDeleting === ruleToDelete.id}
                    className="flex-[2] py-3 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isDeleting === ruleToDelete.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete Automation
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Automations;
