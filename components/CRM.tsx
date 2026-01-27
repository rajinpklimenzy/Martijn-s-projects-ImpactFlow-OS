
import React, { useState, useEffect } from 'react';
import { Building2, User, Globe, Phone, Mail, ChevronRight, Search, Plus, ExternalLink, Calendar, Clock, Sparkles, ArrowRight, X, Trash2, Shield, Settings2, FileSearch, Loader2, AlertTriangle, CheckSquare, ListChecks } from 'lucide-react';
import { Company, Contact, Deal } from '../types';
import { apiGetCompanies, apiGetContacts, apiUpdateCompany, apiDeleteCompany, apiDeleteContact, apiGetDeals } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { ImageWithFallback } from './common';

interface CRMProps {
  onNavigate: (tab: string) => void;
  onAddCompany: () => void;
  onAddContact: () => void;
  externalSearchQuery?: string;
}

const CRM: React.FC<CRMProps> = ({ onNavigate, onAddCompany, onAddContact, externalSearchQuery = '' }) => {
  const { showSuccess, showError } = useToast();
  const [view, setView] = useState<'companies' | 'contacts'>('companies');
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCompanyContacts, setSelectedCompanyContacts] = useState<Contact[]>([]);
  
  // Selection State
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Edit/Single Delete States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', industry: '', website: '', email: '' });

  useEffect(() => {
    if (externalSearchQuery !== undefined) setLocalSearchQuery(externalSearchQuery);
  }, [externalSearchQuery]);

  const fetchDeals = async () => {
    try {
      const response = await apiGetDeals();
      setDeals(response.data || []);
    } catch (err) { setDeals([]); }
  };

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const response = await apiGetCompanies(localSearchQuery.trim() || undefined);
      setCompanies(response.data || []);
    } catch (err) { setCompanies([]); }
    finally { setIsLoading(false); }
  };

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const response = await apiGetContacts(localSearchQuery.trim() || undefined);
      setContacts(response.data || []);
    } catch (err) { setContacts([]); }
    finally { setIsLoading(false); }
  };

  // Fetch data based on current view
  useEffect(() => {
    if (view === 'companies') fetchCompanies();
    else fetchContacts();
  }, [view, localSearchQuery]);

  // Fetch all contacts on mount to show count in tab (regardless of current view)
  useEffect(() => {
    const fetchAllContacts = async () => {
      try {
        const response = await apiGetContacts();
        setContacts(response.data || []);
      } catch (err) {
        setContacts([]);
      }
    };
    fetchAllContacts();
  }, []); // Only run on mount

  useEffect(() => { fetchDeals(); }, []);

  // Fetch contacts for selected company (filter from all contacts)
  const fetchCompanyContacts = async () => {
    if (!selectedCompany?.id) {
      setSelectedCompanyContacts([]);
      return;
    }
    try {
      // Fetch all contacts and filter by companyId
      const response = await apiGetContacts();
      const allContacts = response.data || [];
      const companyContacts = allContacts.filter((contact: Contact) => contact.companyId === selectedCompany.id);
      setSelectedCompanyContacts(companyContacts);
    } catch (err) {
      console.error('[CRM] Failed to fetch company contacts:', err);
      setSelectedCompanyContacts([]);
    }
  };

  // Fetch company contacts when a company is selected
  useEffect(() => {
    if (selectedCompany?.id) {
      fetchCompanyContacts();
    } else {
      setSelectedCompanyContacts([]);
    }
  }, [selectedCompany?.id]);

  // Listen for refresh events from QuickCreateModal
  useEffect(() => {
    const handleRefresh = () => {
      console.log('[CRM] Refresh event received, refreshing data...');
      // Refresh current view data
      if (view === 'companies') {
        fetchCompanies();
      } else {
        fetchContacts();
      }
      // Always refresh contacts to update the count in the tab (even when on companies view)
      fetchContacts();
      // Refresh company contacts if a company is selected
      if (selectedCompany?.id) {
        fetchCompanyContacts();
      }
      // Also refresh deals to update pipeline counts
      fetchDeals();
    };

    window.addEventListener('refresh-crm', handleRefresh);
    return () => window.removeEventListener('refresh-crm', handleRefresh);
  }, [view, localSearchQuery, selectedCompany?.id]); // Include selectedCompany to refresh contacts

  const handleBulkDelete = async () => {
    setIsBulkProcessing(true);
    const idsToDelete = view === 'companies' ? selectedCompanyIds : selectedContactIds;
    try {
      if (view === 'companies') {
        await Promise.all(idsToDelete.map(id => apiDeleteCompany(id)));
        setCompanies(prev => prev.filter(c => !idsToDelete.includes(c.id)));
        setSelectedCompanyIds([]);
      } else {
        await Promise.all(idsToDelete.map(id => apiDeleteContact(id)));
        setContacts(prev => prev.filter(c => !idsToDelete.includes(c.id)));
        setSelectedContactIds([]);
      }
      showSuccess(`Deleted ${idsToDelete.length} items successfully`);
      setShowBulkDeleteConfirm(false);
    } catch (err: any) {
      showError('Failed to delete some items');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const toggleAll = () => {
    if (view === 'companies') {
      if (selectedCompanyIds.length === companies.length) setSelectedCompanyIds([]);
      else setSelectedCompanyIds(companies.map(c => c.id));
    } else {
      if (selectedContactIds.length === contacts.length) setSelectedContactIds([]);
      else setSelectedContactIds(contacts.map(c => c.id));
    }
  };

  const getCompanyDealsCount = (companyId: string) => {
    return deals.filter(d => d.companyId === companyId && d.stage !== 'Won' && d.stage !== 'Lost').length;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">CRM</h1>
          <div className="flex gap-4 mt-2">
            <button 
              onClick={() => { setView('companies'); setSelectedContactIds([]); }}
              className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${view === 'companies' ? 'border-indigo-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Companies ({companies.length})
            </button>
            <button 
              onClick={() => { setView('contacts'); setSelectedCompanyIds([]); }}
              className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${view === 'contacts' ? 'border-indigo-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Contacts ({contacts.length})
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={toggleAll}
            className="flex-1 sm:flex-none px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
          >
            <ListChecks className="w-4 h-4" />
            {((view === 'companies' && selectedCompanyIds.length === companies.length) || (view === 'contacts' && selectedContactIds.length === contacts.length)) && companies.length > 0 ? 'Deselect All' : 'Select All'}
          </button>
          <button 
            onClick={() => view === 'companies' ? onAddCompany() : onAddContact()}
            className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add {view === 'companies' ? 'Company' : 'Contact'}
          </button>
        </div>
      </div>

      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
        <input 
          type="text" 
          placeholder={`Search ${view}...`} 
          value={localSearchQuery}
          onChange={(e) => setLocalSearchQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
        />
        {localSearchQuery && (
          <button onClick={() => setLocalSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"><X className="w-4 h-4" /></button>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Scanning Registry...</p>
        </div>
      ) : (view === 'companies' ? companies : contacts).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-slate-300 rounded-2xl">
          <FileSearch className="w-12 h-12 text-slate-200 mb-4" />
          <h3 className="text-lg font-bold text-slate-900">No {view} found</h3>
          <button onClick={() => setLocalSearchQuery('')} className="mt-4 text-indigo-600 font-bold text-sm hover:underline">Clear Search</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {view === 'companies' ? (
            companies.map(company => {
              const isSelected = selectedCompanyIds.includes(company.id);
              return (
                <div 
                  key={company.id} 
                  onClick={() => setSelectedCompany(company)}
                  className={`bg-white p-6 rounded-2xl border transition-all cursor-pointer group shadow-sm flex flex-col h-full relative active:scale-[0.98] ${isSelected ? 'border-indigo-600 ring-2 ring-indigo-50 bg-indigo-50/10' : 'border-slate-200 hover:border-indigo-300 hover:shadow-md'}`}
                >
                  <div className="absolute top-4 right-4 z-10" onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCompanyIds(prev => isSelected ? prev.filter(id => id !== company.id) : [...prev, company.id]);
                  }}>
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200 group-hover:border-indigo-300'}`}>
                      {isSelected && <CheckSquare className="w-4 h-4 text-white" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mb-6 pr-8">
                    <ImageWithFallback src={company.logo} fallbackText={company.name} className="w-12 h-12 border border-slate-100 shadow-sm" isAvatar={false} />
                    <div className="flex-1 overflow-hidden">
                      <h3 className="font-bold text-lg text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{company.name}</h3>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{company.industry}</p>
                    </div>
                  </div>
                  <div className="space-y-3 mb-6 flex-1 text-sm text-slate-600">
                    <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-slate-400" /><span className="truncate">{company.website}</span></div>
                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" /><span>Client since 2024</span></div>
                  </div>
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{getCompanyDealsCount(company.id)} Pipeline Items</span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              );
            })
          ) : (
            contacts.map(contact => {
              const company = companies.find(c => c.id === contact.companyId);
              const isSelected = selectedContactIds.includes(contact.id);
              return (
                <div 
                  key={contact.id} 
                  className={`bg-white p-6 rounded-2xl border transition-all group shadow-sm relative ${isSelected ? 'border-indigo-600 ring-2 ring-indigo-50 bg-indigo-50/10' : 'border-slate-200 hover:border-indigo-300 hover:shadow-md'}`}
                >
                  <div className="absolute top-4 right-4 z-10" onClick={() => {
                    setSelectedContactIds(prev => isSelected ? prev.filter(id => id !== contact.id) : [...prev, contact.id]);
                  }}>
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200 group-hover:border-indigo-300'}`}>
                      {isSelected && <CheckSquare className="w-4 h-4 text-white" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mb-6 pr-8">
                    <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xl uppercase shadow-inner">{contact.name.charAt(0)}</div>
                    <div className="flex-1 overflow-hidden">
                      <h3 className="font-bold text-lg text-slate-900 truncate">{contact.name}</h3>
                      <p className="text-slate-500 text-xs font-bold uppercase">{contact.role} at {company?.name || 'Partner'}</p>
                    </div>
                  </div>
                  <div className="space-y-3 mb-6 text-sm text-slate-600">
                    <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /><span className="truncate text-indigo-600">{contact.email}</span></div>
                    <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" /><span>{contact.phone}</span></div>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 py-2.5 bg-slate-50 text-slate-600 text-[10px] font-black rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors uppercase tracking-widest">Open Profile</button>
                    <button className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"><Mail className="w-4 h-4" /></button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Bulk Action Bar - Optimized for Mobile */}
      {(selectedCompanyIds.length > 0 || selectedContactIds.length > 0) && (
        <div className="fixed bottom-6 left-4 right-4 lg:left-1/2 lg:-translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 duration-300">
          <div className="bg-slate-900 text-white rounded-[24px] shadow-2xl px-4 lg:px-6 py-3 flex flex-col sm:flex-row items-center gap-3 sm:gap-6 border border-white/10 max-w-2xl mx-auto">
            <div className="flex items-center justify-between w-full sm:w-auto">
              <span className="text-sm font-bold flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-indigo-400" />
                {view === 'companies' ? selectedCompanyIds.length : selectedContactIds.length} {view} selected
              </span>
              <button onClick={() => { setSelectedCompanyIds([]); setSelectedContactIds([]); }} className="sm:hidden p-2 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="hidden sm:block h-6 w-px bg-white/10" />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button 
                onClick={() => setShowBulkDeleteConfirm(true)}
                disabled={isBulkProcessing}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isBulkProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete Selected
              </button>
              <button onClick={() => { setSelectedCompanyIds([]); setSelectedContactIds([]); }} className="hidden sm:block p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Bulk Delete Confirmation */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowBulkDeleteConfirm(false)} />
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl relative p-8 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Delete {view}?</h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              You are about to permanently remove <span className="font-bold text-slate-900">{view === 'companies' ? selectedCompanyIds.length : selectedContactIds.length} items</span> from your CRM. This action will also delete all associated historical data and cannot be undone.
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

      {/* Company Detail Drawer remains same but ensuring consistency */}
      {selectedCompany && (
        <div className="fixed inset-0 z-[70] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300" onClick={() => setSelectedCompany(null)} />
          <div className="absolute right-0 inset-y-0 w-full max-w-2xl bg-white shadow-2xl pointer-events-auto animate-in slide-in-from-right duration-500 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <ImageWithFallback src={selectedCompany.logo} fallbackText={selectedCompany.name} className="w-12 h-12 border border-slate-200" isAvatar={false} />
                <div><h2 className="text-xl font-bold text-slate-900">{selectedCompany.name}</h2><p className="text-xs text-slate-500">{selectedCompany.industry}</p></div>
              </div>
              <button onClick={() => setSelectedCompany(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8">
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                     <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Verified Partner</span>
                   </div>
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Logistics Tier</p>
                     <span className="text-xs font-bold text-indigo-600">Enterprise Core</span>
                   </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Contacts ({selectedCompanyContacts.length})</h3>
                  <div className="space-y-3">
                    {selectedCompanyContacts.length > 0 ? selectedCompanyContacts.map(contact => (
                      <div key={contact.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-indigo-200 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-xs font-black text-indigo-600 uppercase">{contact.name.charAt(0)}</div>
                          <div><p className="text-sm font-bold text-slate-900">{contact.name}</p><p className="text-[10px] text-slate-500 font-bold uppercase">{contact.role}</p></div>
                        </div>
                        <div className="flex gap-2">
                           <button className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600"><Mail className="w-4 h-4" /></button>
                        </div>
                      </div>
                    )) : (
                      <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-3xl text-slate-300">
                        <User className="w-10 h-10 mx-auto mb-2 opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest">No Contacts Listed</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-white flex gap-3">
              <button onClick={() => { setSelectedCompanyIds([selectedCompany.id]); setShowBulkDeleteConfirm(true); }} className="px-5 py-4 border border-slate-200 bg-white text-red-500 hover:bg-red-50 rounded-2xl transition-all"><Trash2 className="w-6 h-6" /></button>
              <button onClick={() => setIsEditModalOpen(true)} className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100">Update Profile</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRM;
