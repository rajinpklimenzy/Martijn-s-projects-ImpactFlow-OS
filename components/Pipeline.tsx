
import React, { useState, useEffect } from 'react';
import { MoreHorizontal, Plus, Calendar, DollarSign, ArrowRight, Settings2, X, Check, Building2, User, Clock, Trash2, Loader2, AlertCircle } from 'lucide-react';
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
  const [isSaving, setIsSaving] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: () => {},
    type: 'danger'
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
        if (!userId) {
          setDeals([]);
          setCompanies([]);
          setUsers([]);
          setIsLoading(false);
          return;
        }
        
        const dealsResponse = await apiGetDeals(userId);
        const fetchedDeals = dealsResponse?.data || dealsResponse || [];
        setDeals(Array.isArray(fetchedDeals) ? fetchedDeals : []);

        try {
          const companiesResponse = await apiGetCompanies();
          setCompanies(companiesResponse?.data || companiesResponse || []);
        } catch (err) {
          setCompanies([]);
        }

        try {
          const usersResponse = await apiGetUsers();
          setUsers(usersResponse?.data || usersResponse || []);
        } catch (err) {
          setUsers([]);
        }
      } catch (err: any) {
        showError(err.message || 'Failed to load deals');
        setDeals([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [currentUser]);

  useEffect(() => {
    if (selectedDeal) {
      setEditFormData({
        title: selectedDeal.title,
        value: selectedDeal.value,
        stage: selectedDeal.stage,
        expectedCloseDate: selectedDeal.expectedCloseDate,
        description: selectedDeal.description || ''
      });
    }
  }, [selectedDeal]);

  useEffect(() => {
    const handleRefresh = async () => {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      try {
        const dealsResponse = await apiGetDeals(userId);
        setDeals(dealsResponse.data || []);
      } catch (err) {}
    };
    window.addEventListener('refresh-pipeline', handleRefresh);
    return () => window.removeEventListener('refresh-pipeline', handleRefresh);
  }, [currentUser]);

  const handleUpdateDeal = async () => {
    if (!selectedDeal || !editFormData) return;
    setIsSaving(true);
    try {
      await apiUpdateDeal(selectedDeal.id, editFormData);
      showSuccess('Deal updated successfully');
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      const dealsResponse = await apiGetDeals(userId);
      setDeals(dealsResponse.data || []);
      const updatedDeal = dealsResponse.data?.find((d: Deal) => d.id === selectedDeal.id);
      if (updatedDeal) setSelectedDeal(updatedDeal);
    } catch (err: any) {
      showError(err.message || 'Failed to update deal');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDeal = () => {
    if (!selectedDeal) return;
    setConfirmModal({
      isOpen: true,
      title: 'Delete Deal',
      message: 'Are you sure you want to delete this deal? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          await apiDeleteDeal(selectedDeal.id);
          showSuccess('Deal deleted successfully');
          setSelectedDeal(null);
          const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
          const dealsResponse = await apiGetDeals(userId);
          setDeals(dealsResponse.data || []);
        } catch (err: any) {
          showError(err.message || 'Failed to delete deal');
        }
      }
    });
  };

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
            onClick={() => onNewDeal()}
            className="p-2 lg:px-4 lg:py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-sm"
          >
            <Plus className="w-5 h-5 lg:w-4 lg:h-4" />
            <span className="hidden sm:inline">New Deal</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 lg:gap-6 overflow-x-auto pb-4 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide snap-x snap-mandatory lg:snap-none">
        {isLoading ? (
          <div className="flex items-center justify-center w-full min-h-[400px]">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : deals.length === 0 ? (
          <div className="flex flex-col items-center justify-center w-full min-h-[400px] bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
              <Building2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No Deals Found</h3>
            <p className="text-slate-500 text-sm mb-6">Get started by creating your first deal opportunity.</p>
            <button 
              onClick={() => onNewDeal()}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create Your First Deal
            </button>
          </div>
        ) : (
          stages.map(stage => {
            const stageDeals = deals.filter(d => d.stage === stage);
            const stageValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
            return (
              <div key={stage} className="flex flex-col w-72 lg:w-80 shrink-0 snap-center">
                <div className="flex justify-between items-center mb-4 px-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm lg:text-base">{stage}</h3>
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                      {stageDeals.length}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    ${stageValue.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                  {stageDeals.map(deal => {
                    const company = companies.find(c => c.id === deal.companyId);
                    const owner = users.find(u => u.id === deal.ownerId);
                    return (
                      <div 
                        key={deal.id} 
                        onClick={() => setSelectedDeal(deal)}
                        className={`bg-white p-4 rounded-xl border transition-all cursor-pointer group select-none active:scale-[0.98] ${selectedDeal?.id === deal.id ? 'border-indigo-600 ring-2 ring-indigo-50 shadow-md' : 'border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200'}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <ImageWithFallback
                            src={company?.logo}
                            alt={company?.name || ''}
                            fallbackText={company?.name || 'C'}
                            className="w-5 h-5 border border-slate-100"
                            isAvatar={false}
                          />
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDeal(deal);
                            }}
                            className="p-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity"
                          >
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
                          <ImageWithFallback
                            src={owner?.avatar}
                            alt={owner?.name || ''}
                            fallbackText={owner?.name || owner?.email || 'U'}
                            className="w-5 h-5 border border-white ring-1 ring-slate-100"
                            isAvatar={true}
                          />
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
                    onClick={() => onNewDeal(stage)}
                    className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-[10px] font-bold hover:border-indigo-200 hover:text-indigo-400 transition-all uppercase tracking-widest active:bg-slate-50"
                  >
                    + Add Deal
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

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
                  <select 
                    value={editFormData?.stage || selectedDeal.stage} 
                    onChange={(e) => setEditFormData({ ...editFormData, stage: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    {stages.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expected Value</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input 
                      type="number" 
                      value={editFormData?.value || selectedDeal.value} 
                      onChange={(e) => setEditFormData({ ...editFormData, value: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100" 
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Title</label>
                <input 
                  type="text" 
                  value={editFormData?.title || selectedDeal.title} 
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expected Close Date</label>
                <input 
                  type="date" 
                  value={editFormData?.expectedCloseDate || selectedDeal.expectedCloseDate || ''} 
                  onChange={(e) => setEditFormData({ ...editFormData, expectedCloseDate: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description / Notes</label>
                <textarea 
                  value={editFormData?.description || ''} 
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100 resize-none" 
                  placeholder="Add any relevant details..."
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Associations</h3>
                <div className="space-y-3">
                  <div 
                    onClick={() => onNavigate('crm')}
                    className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-200 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <ImageWithFallback
                        src={companies.find(c => c.id === selectedDeal.companyId)?.logo}
                        alt={companies.find(c => c.id === selectedDeal.companyId)?.name || ''}
                        fallbackText={companies.find(c => c.id === selectedDeal.companyId)?.name || 'C'}
                        className="w-10 h-10 border border-slate-100"
                        isAvatar={false}
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-900">{companies.find(c => c.id === selectedDeal.companyId)?.name || 'Unknown Company'}</p>
                        <p className="text-xs text-slate-500">Company Account</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-all group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
              <button 
                onClick={handleUpdateDeal}
                disabled={isSaving}
                className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
              </button>
              <button 
                onClick={handleDeleteDeal}
                className="px-5 py-3 border border-slate-200 bg-white text-red-500 hover:bg-red-50 rounded-xl transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showStageConfig && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowStageConfig(false)} />
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <Settings2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">Pipeline Stages</h3>
              </div>
              <button onClick={() => setShowStageConfig(false)} className="p-2 hover:bg-white rounded-full text-slate-400 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 space-y-4">
              {stages.map((stage, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}</span>
                  <input 
                    type="text" 
                    value={stage} 
                    className="flex-1 bg-transparent text-sm font-bold outline-none"
                    onChange={(e) => {
                      const newStages = [...stages];
                      newStages[idx] = e.target.value;
                      setStages(newStages);
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button onClick={() => setShowStageConfig(false)} className="flex-1 py-3 bg-slate-900 text-white text-sm font-bold rounded-xl">Save Workspace</button>
            </div>
          </div>
        </div>
      )}

      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-lg text-slate-900">{confirmModal.title}</h3>
            <p className="text-sm text-slate-600">{confirmModal.message}</p>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl">Cancel</button>
              <button onClick={confirmModal.onConfirm} className={`flex-1 px-4 py-2.5 text-white font-bold rounded-xl ${confirmModal.type === 'danger' ? 'bg-red-600' : 'bg-indigo-600'}`}>
                {confirmModal.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pipeline;
