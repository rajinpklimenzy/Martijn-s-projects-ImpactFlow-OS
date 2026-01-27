
import React, { useState, useEffect } from 'react';
import { MoreHorizontal, Plus, Calendar, DollarSign, ArrowRight, Settings2, X, Check, Building2, User, Clock, Trash2, Loader2, AlertCircle, CheckSquare, AlertTriangle, ListChecks } from 'lucide-react';
import { Deal, Company, User as UserType } from '../types';
import { apiGetDeals, apiUpdateDeal, apiDeleteDeal, apiGetCompanies, apiGetUsers } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { ImageWithFallback } from './common';

interface PipelineProps {
  onNavigate: (tab: string) => void;
  onNewDeal: (stage?: string) => void;
  currentUser?: any;
}

const DEFAULT_STAGES = ['Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost'];

const Pipeline: React.FC<PipelineProps> = ({ onNavigate, onNewDeal, currentUser }) => {
  const { showSuccess, showError } = useToast();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [showStageConfig, setShowStageConfig] = useState(false);
  const [stages, setStages] = useState([...DEFAULT_STAGES]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Selection State
  const [selectedDealIds, setSelectedDealIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
        const dealsResponse = await apiGetDeals(userId);
        const fetchedDeals = dealsResponse?.data || dealsResponse || [];
        setDeals(Array.isArray(fetchedDeals) ? fetchedDeals : []);
        try {
          const companiesResponse = await apiGetCompanies();
          setCompanies(companiesResponse?.data || companiesResponse || []);
        } catch (err) { setCompanies([]); }
        try {
          const usersResponse = await apiGetUsers();
          setUsers(usersResponse?.data || usersResponse || []);
        } catch (err) { setUsers([]); }
      } catch (err: any) {
        showError('Failed to load deals');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [currentUser]);

  const handleBulkMove = async (stage: any) => {
    if (!selectedDealIds.length) return;
    setIsBulkProcessing(true);
    try {
      await Promise.all(selectedDealIds.map(id => apiUpdateDeal(id, { stage })));
      setDeals(prev => prev.map(d => selectedDealIds.includes(d.id) ? { ...d, stage } : d));
      showSuccess(`Moved ${selectedDealIds.length} deals to ${stage}`);
      setSelectedDealIds([]);
    } catch (err) {
      showError('Bulk move failed');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedDealIds.length) return;
    setIsBulkProcessing(true);
    try {
      await Promise.all(selectedDealIds.map(id => apiDeleteDeal(id)));
      setDeals(prev => prev.filter(d => !selectedDealIds.includes(d.id)));
      showSuccess(`Successfully removed ${selectedDealIds.length} deals`);
      setSelectedDealIds([]);
      setShowBulkDeleteConfirm(false);
    } catch (err) {
      showError('Bulk delete failed');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDealIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedDealIds.length === deals.length && deals.length > 0) {
      setSelectedDealIds([]);
    } else {
      setSelectedDealIds(deals.map(d => d.id));
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 lg:gap-6 animate-in slide-in-from-right-2 duration-500 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0 gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">Pipeline</h1>
          <p className="text-slate-500 text-xs lg:text-sm">Active opportunities across {stages.length} stages</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={toggleSelectAll}
            className="flex-1 sm:flex-none px-3 py-2 border border-slate-200 bg-white text-slate-600 rounded-lg hover:bg-slate-50 transition-all shadow-sm text-xs font-bold flex items-center justify-center gap-2"
          >
            <ListChecks className="w-4 h-4" />
            {selectedDealIds.length === deals.length && deals.length > 0 ? 'Deselect All' : 'Select All'}
          </button>
          <button onClick={() => setShowStageConfig(true)} className="p-2 border border-slate-200 bg-white text-slate-600 rounded-lg hover:bg-slate-50 transition-all shadow-sm">
            <Settings2 className="w-5 h-5 lg:w-4 lg:h-4" />
          </button>
          <button onClick={() => onNewDeal()} className="flex-1 sm:flex-none p-2 lg:px-4 lg:py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-sm">
            <Plus className="w-5 h-5 lg:w-4 lg:h-4" />
            <span className="hidden sm:inline">New Deal</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 lg:gap-6 overflow-x-auto pb-4 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide snap-x snap-mandatory lg:snap-none">
        {isLoading ? (
          <div className="flex items-center justify-center w-full min-h-[400px]"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
        ) : (
          stages.map(stage => {
            const stageDeals = deals.filter(d => d.stage === stage);
            return (
              <div key={stage} className="flex flex-col w-[85vw] sm:w-72 lg:w-80 shrink-0 snap-center">
                <div className="flex justify-between items-center mb-4 px-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm lg:text-base">{stage}</h3>
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">{stageDeals.length}</span>
                  </div>
                </div>
                
                <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                  {stageDeals.map(deal => {
                    const company = companies.find(c => c.id === deal.companyId);
                    const isItemSelected = selectedDealIds.includes(deal.id);
                    return (
                      <div 
                        key={deal.id} 
                        onClick={() => setSelectedDeal(deal)}
                        className={`bg-white p-4 rounded-xl border transition-all cursor-pointer group relative active:scale-[0.98] ${isItemSelected ? 'border-indigo-600 ring-2 ring-indigo-50 shadow-md bg-indigo-50/5' : 'border-slate-200 shadow-sm hover:border-indigo-200 hover:shadow-md'}`}
                      >
                        <div className="absolute top-4 right-4 z-10" onClick={(e) => toggleSelection(deal.id, e)}>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isItemSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover:border-indigo-400'}`}>
                            {isItemSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-2 pr-6">
                          <ImageWithFallback src={company?.logo} fallbackText={company?.name} className="w-5 h-5" isAvatar={false} />
                          <h4 className="font-bold text-slate-900 text-sm leading-tight truncate group-hover:text-indigo-600 transition-colors">{deal.title}</h4>
                        </div>
                        <p className="text-[10px] text-slate-500 mb-4 font-medium uppercase tracking-wider">{company?.name}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-600 font-black text-xs">${deal.value.toLocaleString()}</span>
                          <span className="text-[9px] font-bold text-slate-400">{deal.expectedCloseDate}</span>
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={() => onNewDeal(stage)} className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-[10px] font-bold hover:border-indigo-200 uppercase tracking-widest">+ Add Deal</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bulk Action Bar - Optimized for Mobile */}
      {selectedDealIds.length > 0 && (
        <div className="fixed bottom-6 left-4 right-4 lg:left-1/2 lg:-translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 duration-300">
          <div className="bg-slate-900 text-white rounded-[24px] shadow-2xl px-4 lg:px-6 py-3 flex flex-col sm:flex-row items-center gap-3 sm:gap-6 border border-white/10 max-w-2xl mx-auto">
            <div className="flex items-center justify-between w-full sm:w-auto">
              <span className="text-sm font-bold flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-indigo-400" />
                {selectedDealIds.length} deals selected
              </span>
              <button onClick={() => setSelectedDealIds([])} className="sm:hidden p-2 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="hidden sm:block h-6 w-px bg-white/10" />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex-1 sm:flex-none flex items-center bg-white/5 rounded-lg p-1 overflow-x-auto scrollbar-hide">
                {stages.slice(0, 3).map(s => (
                  <button 
                    key={s}
                    onClick={() => handleBulkMove(s)}
                    className="px-2 py-1 hover:bg-white/10 rounded text-[9px] font-black uppercase transition-all whitespace-nowrap"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setShowBulkDeleteConfirm(true)}
                disabled={isBulkProcessing}
                className="p-2 sm:px-4 sm:py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 flex-1 sm:flex-none"
              >
                {isBulkProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Delete</span>
              </button>
              <button onClick={() => setSelectedDealIds([])} className="hidden sm:block p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowBulkDeleteConfirm(false)} />
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl relative p-8 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Delete Deals?</h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              You are about to remove <span className="font-bold text-slate-900">{selectedDealIds.length} deals</span> from your pipeline. This will also remove all historical activities associated with these opportunities.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="flex-1 py-4 bg-slate-50 text-slate-600 font-bold rounded-2xl hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkDelete}
                disabled={isBulkProcessing}
                className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-100 flex items-center justify-center gap-2"
              >
                {isBulkProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simplified Deal Modal */}
      {selectedDeal && (
        <div className="fixed inset-0 z-[70] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto" onClick={() => setSelectedDeal(null)} />
          <div className="absolute right-0 inset-y-0 w-full max-w-xl bg-white shadow-2xl pointer-events-auto animate-in slide-in-from-right duration-500">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-bold">{selectedDeal.title}</h2>
              <button onClick={() => setSelectedDeal(null)} className="p-2 hover:bg-white rounded-full text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Value</p>
                  <h3 className="text-2xl font-black">${selectedDeal.value.toLocaleString()}</h3>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stage</p>
                  <h3 className="text-2xl font-black">{selectedDeal.stage}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pipeline;
