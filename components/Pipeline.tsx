
import React, { useState } from 'react';
import { MOCK_DEALS, MOCK_COMPANIES, MOCK_USERS } from '../constants';
import { MoreHorizontal, Plus, Calendar, DollarSign, ArrowRight, Settings2, X, Check, Building2, User, Clock, Trash2 } from 'lucide-react';
import { Deal } from '../types';

interface PipelineProps {
  onNavigate: (tab: string) => void;
  onNewDeal: () => void;
}

const DEFAULT_STAGES = ['Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost'];

const Pipeline: React.FC<PipelineProps> = ({ onNavigate, onNewDeal }) => {
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showStageConfig, setShowStageConfig] = useState(false);
  const [stages, setStages] = useState([...DEFAULT_STAGES]);

  return (
    <div className="h-full flex flex-col gap-4 lg:gap-6 animate-in slide-in-from-right-2 duration-500 relative">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">Pipeline</h1>
          <p className="text-slate-500 text-xs lg:text-sm">Active opportunities across {stages.length} stages</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowStageConfig(true)}
            className="p-2 border border-slate-200 bg-white text-slate-600 rounded-lg hover:bg-slate-50 transition-all shadow-sm"
            title="Configure Stages"
          >
            <Settings2 className="w-5 h-5 lg:w-4 lg:h-4" />
          </button>
          <button 
            onClick={onNewDeal}
            className="p-2 lg:px-4 lg:py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-sm"
          >
            <Plus className="w-5 h-5 lg:w-4 lg:h-4" />
            <span className="hidden sm:inline">New Deal</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 lg:gap-6 overflow-x-auto pb-4 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide snap-x snap-mandatory lg:snap-none">
        {stages.map(stage => (
          <div key={stage} className="flex flex-col w-72 lg:w-80 shrink-0 snap-center">
            <div className="flex justify-between items-center mb-4 px-2">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm lg:text-base">{stage}</h3>
                <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                  {MOCK_DEALS.filter(d => d.stage === stage).length}
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                ${MOCK_DEALS.filter(d => d.stage === stage).reduce((sum, d) => sum + d.value, 0).toLocaleString()}
              </span>
            </div>
            
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {MOCK_DEALS.filter(d => d.stage === stage).map(deal => {
                const company = MOCK_COMPANIES.find(c => c.id === deal.companyId);
                const owner = MOCK_USERS.find(u => u.id === deal.ownerId);
                return (
                  <div 
                    key={deal.id} 
                    onClick={() => setSelectedDeal(deal)}
                    className={`bg-white p-4 rounded-xl border transition-all cursor-pointer group select-none active:scale-[0.98] ${selectedDeal?.id === deal.id ? 'border-indigo-600 ring-2 ring-indigo-50 shadow-md' : 'border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <img src={company?.logo} alt="" className="w-5 h-5 rounded border border-slate-100" />
                      <button className="p-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-600" />
                      </button>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm leading-tight mb-1 truncate group-hover:text-indigo-600 transition-colors">{deal.title}</h4>
                    <p className="text-[10px] text-slate-500 mb-4 truncate">{company?.name}</p>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1 text-emerald-600 font-bold">
                        <DollarSign className="w-3 h-3" />
                        <span className="text-xs">{deal.value.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400">
                        <Calendar className="w-3 h-3" />
                        <span className="text-[9px] font-bold">{deal.expectedCloseDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                      <img src={owner?.avatar} className="w-5 h-5 rounded-full border border-white ring-1 ring-slate-100" />
                      {deal.stage === 'Won' ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate('projects');
                          }}
                          className="flex items-center gap-1 text-indigo-600 text-[9px] font-bold uppercase tracking-wider hover:underline"
                        >
                          Project <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Active Deal</span>
                      )}
                    </div>
                  </div>
                );
              })}
              <button 
                onClick={onNewDeal}
                className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-[10px] font-bold hover:border-indigo-200 hover:text-indigo-400 transition-all uppercase tracking-widest active:bg-slate-50"
              >
                + Add Deal
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Deal Detail Drawer */}
      {selectedDeal && (
        <div className="fixed inset-0 z-[70] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300" onClick={() => setSelectedDeal(null)} />
          <div className="absolute right-0 inset-y-0 w-full max-w-xl bg-white shadow-2xl pointer-events-auto animate-in slide-in-from-right duration-500 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedDeal.title}</h2>
                  <p className="text-xs text-slate-500">Deal ID: {selectedDeal.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedDeal(null)} className="p-2 hover:bg-white rounded-full text-slate-400 shadow-sm border border-transparent hover:border-slate-200 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deal Stage</label>
                  <select defaultValue={selectedDeal.stage} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100">
                    {stages.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expected Value</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input type="text" defaultValue={selectedDeal.value.toLocaleString()} className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Associations</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-200 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <img src={MOCK_COMPANIES.find(c => c.id === selectedDeal.companyId)?.logo} className="w-10 h-10 rounded border border-slate-100" />
                      <div>
                        <p className="text-sm font-bold text-slate-900">{MOCK_COMPANIES.find(c => c.id === selectedDeal.companyId)?.name}</p>
                        <p className="text-xs text-slate-500">Company Account</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-all group-hover:translate-x-1" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-200 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <img src={MOCK_USERS.find(u => u.id === selectedDeal.ownerId)?.avatar} className="w-10 h-10 rounded-full border border-slate-100" />
                      <div>
                        <p className="text-sm font-bold text-slate-900">{MOCK_USERS.find(u => u.id === selectedDeal.ownerId)?.name}</p>
                        <p className="text-xs text-slate-500">Deal Owner</p>
                      </div>
                    </div>
                    <Settings2 className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-all" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Activity Timeline</h3>
                <div className="space-y-6 relative before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                  {[
                    { title: 'Moved to Negotiation', time: '2 hours ago', icon: <Clock className="w-3 h-3" />, color: 'bg-blue-500' },
                    { title: 'Proposal Sent to Client', time: 'Yesterday', icon: <Check className="w-3 h-3" />, color: 'bg-emerald-500' },
                    { title: 'Deal Created', time: 'May 12, 2024', icon: <Plus className="w-3 h-3" />, color: 'bg-slate-300' },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4 relative">
                      <div className={`w-5 h-5 rounded-full ${item.color} flex items-center justify-center text-white z-10 shadow-sm shrink-0`}>
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="text-xs text-slate-400">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
              <button className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">Save Changes</button>
              <button className="px-5 py-3 border border-slate-200 bg-white text-red-500 hover:bg-red-50 rounded-xl transition-all">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stage Config Modal */}
      {showStageConfig && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowStageConfig(false)} />
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <Settings2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">Pipeline Stages</h3>
              </div>
              <button onClick={() => setShowStageConfig(false)} className="p-2 hover:bg-white rounded-full text-slate-400 shadow-sm border border-transparent hover:border-slate-200 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 space-y-4">
              <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-widest">Active Stages</p>
              {stages.map((stage, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl group">
                  <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}</span>
                  <input 
                    type="text" 
                    value={stage} 
                    className="flex-1 bg-transparent text-sm font-bold outline-none focus:text-indigo-600"
                    onChange={(e) => {
                      const newStages = [...stages];
                      newStages[idx] = e.target.value;
                      setStages(newStages);
                    }}
                  />
                  <button className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-white rounded-lg text-red-400 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-bold hover:border-indigo-200 hover:text-indigo-600 transition-all flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Add New Stage
              </button>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button onClick={() => setShowStageConfig(false)} className="flex-1 py-3 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all">Save Workspace</button>
              <button onClick={() => setShowStageConfig(false)} className="px-6 py-3 text-sm font-bold text-slate-500">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pipeline;
