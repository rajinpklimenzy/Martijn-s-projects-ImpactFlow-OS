
import React, { useState } from 'react';
import { MOCK_AUTOMATIONS } from '../constants';
import { Zap, Play, Settings2, Trash2, Plus, ToggleLeft as Toggle, ToggleRight, X, ArrowRight, CheckCircle2, AlertCircle, Clock, Sparkles } from 'lucide-react';
import { AutomationRule } from '../types';

const Automations: React.FC = () => {
  const [automations, setAutomations] = useState(MOCK_AUTOMATIONS);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const toggleAutomation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  const handleEditRule = (rule: AutomationRule) => {
    setSelectedRule(rule);
    setIsCreating(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Workflow Automations</h1>
          <p className="text-slate-500 text-sm">Automate repetitive tasks and system responses</p>
        </div>
        <button 
          onClick={() => { setSelectedRule(null); setIsCreating(true); }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md"
        >
          <Plus className="w-4 h-4" />
          Create Automation
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {automations.map(rule => (
          <div 
            key={rule.id} 
            onClick={() => handleEditRule(rule)}
            className={`p-6 rounded-xl border transition-all group cursor-pointer active:scale-[0.99] shadow-sm ${rule.active ? 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-md' : 'bg-slate-50 border-slate-100 opacity-80'}`}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl transition-colors ${rule.active ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors">{rule.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${rule.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      {rule.active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={(e) => toggleAutomation(rule.id, e)}
                className="text-slate-400 hover:text-indigo-600 transition-colors"
              >
                {rule.active ? <ToggleRight className="w-8 h-8 text-indigo-600" /> : <Toggle className="w-8 h-8" />}
              </button>
            </div>
            
            <p className="text-sm text-slate-500 mb-6">{rule.description}</p>
            
            <div className="space-y-3 p-4 bg-slate-50 border border-slate-100 rounded-xl group-hover:border-indigo-100 transition-all">
              <div className="flex items-center gap-3 text-sm">
                <span className="text-[10px] font-bold uppercase text-slate-400 w-16">Trigger</span>
                <span className="font-bold text-slate-700">{rule.trigger}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-[10px] font-bold uppercase text-slate-400 w-16">Action</span>
                <span className="font-bold text-slate-700">{rule.action}</span>
              </div>
            </div>

            <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-50">
              <span className="text-xs text-slate-400 font-medium">Last triggered: 2 hours ago</span>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"><Trash2 className="w-4 h-4" /></button>
                <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600"><Settings2 className="w-4 h-4" /></button>
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-sm">
                  <Play className="w-3 h-3" />
                  Test
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Workflow Builder Overlay */}
      {isCreating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsCreating(false)} />
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-lg text-white">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedRule ? 'Edit Automation' : 'New Workflow'}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ImpactFlow Automation Builder</p>
                </div>
              </div>
              <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-white rounded-full text-slate-400 shadow-sm border border-transparent hover:border-slate-200 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" /> General Info
                  </h4>
                  <div className="space-y-4">
                    <input 
                      type="text" 
                      placeholder="Workflow Name (e.g. Lead Follow-up)" 
                      defaultValue={selectedRule?.name}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                    <textarea 
                      placeholder="What does this automation do?" 
                      defaultValue={selectedRule?.description}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 h-24 resize-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="relative pl-10 before:absolute before:left-4 before:top-10 before:bottom-0 before:w-0.5 before:border-l-2 before:border-dashed before:border-indigo-100">
                    <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-lg shadow-indigo-100">1</div>
                    <div className="p-5 bg-white border border-indigo-100 rounded-2xl shadow-sm space-y-4">
                      <h5 className="font-bold text-slate-900 flex items-center gap-2"><Clock className="w-4 h-4 text-indigo-500" /> When this happens... (Trigger)</h5>
                      <select defaultValue={selectedRule?.trigger} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100">
                        <option>Deal Status Changes</option>
                        <option>New Invoice Created</option>
                        <option>Task Completed</option>
                        <option>Incoming Email received</option>
                        <option>Lead Score reaches limit</option>
                      </select>
                    </div>
                  </div>

                  <div className="relative pl-10">
                    <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-lg shadow-emerald-100">2</div>
                    <div className="p-5 bg-white border border-emerald-100 rounded-2xl shadow-sm space-y-4">
                      <h5 className="font-bold text-slate-900 flex items-center gap-2"><Play className="w-4 h-4 text-emerald-500" /> Then do this... (Action)</h5>
                      <select defaultValue={selectedRule?.action} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100">
                        <option>Send Email Template</option>
                        <option>Create Project Workspace</option>
                        <option>Notify Slack Channel</option>
                        <option>Update Contact Record</option>
                        <option>Assign User to Task</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                  <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-500" /> Validation</h4>
                  <ul className="space-y-3">
                    <li className="flex gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Trigger logic is valid
                    </li>
                    <li className="flex gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Action inputs complete
                    </li>
                    <li className="flex gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <Clock className="w-3.5 h-3.5 shrink-0" /> No loops detected
                    </li>
                  </ul>
                </div>
                <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <p className="text-xs font-bold text-indigo-700 uppercase tracking-widest mb-2">Pro Tip</p>
                  <p className="text-xs text-indigo-900 leading-relaxed italic">"Try using the 'Slack Notify' action for urgent Deal changes to keep your team aligned."</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
              <button onClick={() => setIsCreating(false)} className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">Publish Workflow</button>
              <button onClick={() => setIsCreating(false)} className="px-6 py-3 text-sm font-bold text-slate-500">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Automations;
