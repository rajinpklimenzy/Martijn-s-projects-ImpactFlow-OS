
import React, { useState, useEffect } from 'react';
import { Building2, User, Globe, Phone, Mail, ChevronRight, Search, Plus, ExternalLink, Calendar, Clock, Sparkles, ArrowRight, X, Trash2, Shield, Settings2, FileSearch, Loader2, AlertTriangle } from 'lucide-react';
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

// Format date to readable format with AM/PM
const formatLastContacted = (dateString: string | undefined): string => {
  if (!dateString) return 'Never';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    // Format: "Jan 22, 2026 at 8:41 AM"
    const datePart = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    const timePart = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    return `${datePart} at ${timePart}`;
  } catch (error) {
    return 'Invalid date';
  }
};

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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editFormData, setEditFormData] = useState<{ name: string; industry: string; website: string; email: string }>({
    name: '',
    industry: '',
    website: '',
    email: ''
  });
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [isContactDeleteConfirmOpen, setIsContactDeleteConfirmOpen] = useState(false);
  const [isDeletingContact, setIsDeletingContact] = useState(false);

  // Sync external search query from App header if provided
  useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setLocalSearchQuery(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  // Fetch deals
  const fetchDeals = async () => {
    try {
      const response = await apiGetDeals();
      setDeals(response.data || []);
    } catch (err) {
      console.error('Failed to fetch deals:', err);
      setDeals([]);
    }
  };

  // Fetch companies
  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      // Only pass search query if it's not empty
      const searchQuery = localSearchQuery.trim() || undefined;
      const response = await apiGetCompanies(searchQuery);
      setCompanies(response.data || []);
    } catch (err) {
      console.error('Failed to fetch companies:', err);
      setCompanies([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'companies') {
      fetchCompanies();
    }
  }, [view, localSearchQuery]);

  // Fetch deals when component mounts
  useEffect(() => {
    fetchDeals();
  }, []);

  // Fetch contacts
  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      // Only pass search query if it's not empty
      const searchQuery = localSearchQuery.trim() || undefined;
      const response = await apiGetContacts(searchQuery);
      setContacts(response.data || []);
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'contacts') {
      fetchContacts();
    }
  }, [view, localSearchQuery]);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      if (view === 'companies') {
        fetchCompanies();
      } else if (view === 'contacts') {
        fetchContacts();
      }
      if (selectedCompany) {
        fetchCompanyContacts();
      }
      fetchDeals(); // Refresh deals when CRM is refreshed
    };

    window.addEventListener('refresh-crm', handleRefresh);
    window.addEventListener('refresh-pipeline', handleRefresh); // Also refresh when deals are updated
    return () => {
      window.removeEventListener('refresh-crm', handleRefresh);
      window.removeEventListener('refresh-pipeline', handleRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedCompany]);

  // Fetch contacts for selected company
  const fetchCompanyContacts = async () => {
    if (!selectedCompany?.id) {
      setSelectedCompanyContacts([]);
      return;
    }
    try {
      console.log('[CRM] Fetching contacts for company:', selectedCompany.id, selectedCompany.name);
      const response = await apiGetContacts(undefined, selectedCompany.id);
      console.log('[CRM] Contacts response:', response);
      console.log('[CRM] Contacts data:', response.data);
      console.log('[CRM] Contacts count:', response.data?.length || 0);
      
      if (response && response.data) {
        setSelectedCompanyContacts(response.data);
      } else {
        console.warn('[CRM] No contacts data in response');
        setSelectedCompanyContacts([]);
      }
    } catch (err) {
      console.error('[CRM] Failed to fetch company contacts:', err);
      setSelectedCompanyContacts([]);
    }
  };

  useEffect(() => {
    if (selectedCompany?.id) {
      fetchCompanyContacts();
    } else {
      setSelectedCompanyContacts([]);
    }
  }, [selectedCompany?.id]);

  // Initialize edit form when company is selected
  useEffect(() => {
    if (selectedCompany) {
      setEditFormData({
        name: selectedCompany.name || '',
        industry: selectedCompany.industry || '',
        website: selectedCompany.website || '',
        email: selectedCompany.email || ''
      });
    }
  }, [selectedCompany]);

  const handleUpdateCompany = async () => {
    if (!selectedCompany) return;

    setIsUpdating(true);
    try {
      await apiUpdateCompany(selectedCompany.id, editFormData);
      // Refresh companies list
      if (view === 'companies') {
        fetchCompanies();
      }
      // Update selected company
      const updatedCompany = { ...selectedCompany, ...editFormData };
      setSelectedCompany(updatedCompany);
      setIsEditModalOpen(false);
      showSuccess('Company updated successfully!');
      window.dispatchEvent(new Event('refresh-crm'));
    } catch (err: any) {
      console.error('Failed to update company:', err);
      showError(err.message || 'Failed to update company');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!selectedCompany) return;

    setIsDeleting(true);
    try {
      await apiDeleteCompany(selectedCompany.id);
      // Close modals
      setIsDeleteConfirmOpen(false);
      setSelectedCompany(null);
      // Refresh companies list
      if (view === 'companies') {
        fetchCompanies();
      }
      // Refresh contacts if on contacts view
      if (view === 'contacts') {
        fetchContacts();
      }
      showSuccess('Company and associated contacts deleted successfully!');
      window.dispatchEvent(new Event('refresh-crm'));
    } catch (err: any) {
      console.error('Failed to delete company:', err);
      showError(err.message || 'Failed to delete company');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!contactToDelete) return;

    setIsDeletingContact(true);
    try {
      await apiDeleteContact(contactToDelete.id);
      // Close modal
      setIsContactDeleteConfirmOpen(false);
      setContactToDelete(null);
      // Refresh contacts list
      if (view === 'contacts') {
        fetchContacts();
      }
      // Refresh company contacts if a company is selected
      if (selectedCompany) {
        fetchCompanyContacts();
      }
      showSuccess('Contact deleted successfully!');
      window.dispatchEvent(new Event('refresh-crm'));
    } catch (err: any) {
      console.error('Failed to delete contact:', err);
      showError(err.message || 'Failed to delete contact');
    } finally {
      setIsDeletingContact(false);
    }
  };

  const getCompanyDealsCount = (companyId: string) => {
    // Count only open deals (not "Won" or "Lost")
    return deals.filter(d => 
      d.companyId === companyId && 
      d.stage !== 'Won' && 
      d.stage !== 'Lost'
    ).length;
  };

  const generateEmailFromName = (name: string, domain: string) => {
    const formattedName = name.toLowerCase().replace(/\s+/g, '.');
    return `${formattedName}@${domain}`;
  };

  const filteredCompanies = companies;
  const filteredContacts = contacts;

  const hasResults = view === 'companies' ? filteredCompanies.length > 0 : filteredContacts.length > 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">CRM</h1>
          <div className="flex gap-4 mt-2">
            <button 
              onClick={() => setView('companies')}
              className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${view === 'companies' ? 'border-indigo-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Companies
            </button>
            <button 
              onClick={() => setView('contacts')}
              className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${view === 'contacts' ? 'border-indigo-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Contacts
            </button>
          </div>
        </div>
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (view === 'companies') {
              onAddCompany();
            } else {
              onAddContact();
            }
          }}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add {view === 'companies' ? 'Company' : 'Contact'}
        </button>
      </div>

      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
        <input 
          type="text" 
          placeholder={`Search ${view} by name, ${view === 'companies' ? 'industry, or website' : 'email, or role'}...`} 
          value={localSearchQuery}
          onChange={(e) => setLocalSearchQuery(e.target.value)}
          className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
        />
        {localSearchQuery && (
          <button 
            onClick={() => setLocalSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {!hasResults && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-slate-300 rounded-2xl animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
            <FileSearch className="w-8 h-8" />
          </div>
          {localSearchQuery.trim() ? (
            <>
              <h3 className="text-lg font-bold text-slate-900">No {view} match "{localSearchQuery}"</h3>
              <p className="text-slate-500 text-sm mt-1">Try a different search term or add a new record.</p>
              <button 
                onClick={() => setLocalSearchQuery('')}
                className="mt-6 text-indigo-600 font-bold text-sm hover:underline"
              >
                Clear Search
              </button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold text-slate-900">No {view === 'companies' ? 'Companies' : 'Contacts'} Found</h3>
              <p className="text-slate-500 text-sm mt-1">Get started by adding your first {view === 'companies' ? 'company' : 'contact'}.</p>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (view === 'companies') {
                    onAddCompany();
                  } else {
                    onAddContact();
                  }
                }}
                className="mt-6 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add {view === 'companies' ? 'Company' : 'Contact'}
              </button>
            </>
          )}
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
          <p className="text-slate-500 text-sm">Loading {view}...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {view === 'companies' ? (
            filteredCompanies.map(company => (
              <div 
                key={company.id} 
                onClick={() => setSelectedCompany(company)}
                className="bg-white p-6 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group shadow-sm flex flex-col h-full active:scale-[0.98]"
              >
                <div className="flex items-center gap-4 mb-6">
                  <ImageWithFallback
                    src={company.logo}
                    alt={company.name}
                    fallbackText={company.name}
                    className="w-12 h-12 border border-slate-100 shadow-sm object-cover"
                    isAvatar={false}
                  />
                  <div className="flex-1 overflow-hidden">
                    <h3 className="font-bold text-lg text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{company.name}</h3>
                    <p className="text-slate-500 text-sm">{company.industry}</p>
                  </div>
                  <button className="p-2 text-slate-300 hover:text-indigo-600 transition-colors">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3 mb-6 flex-1">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Globe className="w-4 h-4 text-slate-400" />
                    <span className="truncate">{company.website}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Client since Oct 2023</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-500 bg-indigo-50/50 w-fit px-2 py-1 rounded">
                    <Sparkles className="w-3 h-3" />
                    @{company.website.split('/')[0]}
                  </div>
                </div>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate('pipeline');
                  }}
                  className="flex items-center justify-between pt-4 border-t border-slate-100 group/link hover:bg-slate-50 -mx-6 -mb-6 px-6 pb-6 rounded-b-xl transition-colors"
                >
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest group-hover/link:text-indigo-600">
                    {getCompanyDealsCount(company.id)} Open Deals
                  </span>
                  <div className="flex items-center gap-1 text-indigo-600 font-bold text-[10px] uppercase opacity-0 group-hover/link:opacity-100 transition-all translate-x-2 group-hover/link:translate-x-0">
                    View Pipeline <ChevronRight className="w-3 h-3" />
                  </div>
                </button>
              </div>
            ))
          ) : (
            filteredContacts.map(contact => {
              const company = companies.find(c => c.id === contact.companyId);
              return (
                <div 
                  key={contact.id} 
                  className="bg-white p-6 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-default group shadow-sm"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xl uppercase shadow-inner">
                      {contact.name.charAt(0)}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h3 className="font-bold text-lg text-slate-900 truncate">{contact.name}</h3>
                      <p className="text-slate-500 text-xs font-medium">{contact.role} at {company?.name}</p>
                    </div>
                  </div>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="truncate text-indigo-600 hover:underline cursor-pointer">{contact.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{contact.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>Last contacted: {formatLastContacted(contact.lastContacted)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 py-2 bg-slate-50 text-slate-600 text-[10px] font-bold rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors uppercase tracking-widest">
                      Timeline
                    </button>
                    <button className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                      <Mail className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setContactToDelete(contact);
                        setIsContactDeleteConfirmOpen(true);
                      }}
                      className="px-3 py-2 border border-red-200 bg-white text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete contact"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Suggestion Banner */}
      <div className="bg-indigo-900 rounded-2xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative shadow-xl shadow-indigo-100">
        <div className="relative z-10">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-300" />
            Automatic Email Generation
          </h3>
          <p className="text-indigo-200 text-sm mt-1">New contacts are automatically assigned emails based on company domains.</p>
        </div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="bg-indigo-800/50 px-4 py-2 rounded-xl border border-indigo-700 text-xs font-mono">
            {generateEmailFromName("Alex Rivera", "globallogistics.com")}
          </div>
          <ArrowRight className="w-4 h-4 text-indigo-400" />
        </div>
        <Building2 className="absolute -right-8 -bottom-8 w-48 h-48 text-indigo-800 opacity-20" />
      </div>

      {/* Company Detail Drawer */}
      {selectedCompany && (
        <div className="fixed inset-0 z-[70] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300" onClick={() => setSelectedCompany(null)} />
          <div className="absolute right-0 inset-y-0 w-full max-w-2xl bg-white shadow-2xl pointer-events-auto animate-in slide-in-from-right duration-500 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <img
                  src={selectedCompany.logo}
                  alt={selectedCompany.name}
                  fallbackText={selectedCompany.name}
                  className="w-12 h-12 border border-slate-200 shadow-sm object-cover"
                  isAvatar={false}
                />
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedCompany.name}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500">{selectedCompany.industry}</span>
                    <span className="text-[10px] text-slate-300">•</span>
                    <a href={`https://${selectedCompany.website}`} target="_blank" className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1">
                      {selectedCompany.website} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedCompany(null)} className="p-2 hover:bg-white rounded-full text-slate-400 shadow-sm border border-transparent hover:border-slate-200 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Shield className="w-3.5 h-3.5" /> Security Rating</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[85%]" />
                    </div>
                    <span className="text-xs font-bold text-emerald-600">A+</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Settings2 className="w-3.5 h-3.5" /> System Status</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-slate-700">Healthy</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contacts ({selectedCompanyContacts.length})</h3>
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onAddContact();
                    }} 
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Contact
                  </button>
                </div>
                <div className="space-y-3">
                  {selectedCompanyContacts.length === 0 ? (
                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl text-center">
                      <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500 font-medium">No contacts yet</p>
                      <p className="text-xs text-slate-400 mt-1">Add a contact to get started</p>
                    </div>
                  ) : (
                    selectedCompanyContacts.map(contact => (
                      <div key={contact.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-400 uppercase">{contact.name.charAt(0)}</div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{contact.name}</p>
                            <p className="text-[10px] text-slate-500 font-medium">{contact.role || 'No role'}</p>
                          </div>
                        </div>
                      <div className="flex gap-2">
                        <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 shadow-sm transition-all"><Mail className="w-3.5 h-3.5" /></button>
                        <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 shadow-sm transition-all"><Phone className="w-3.5 h-3.5" /></button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setContactToDelete(contact);
                            setIsContactDeleteConfirmOpen(true);
                          }}
                          className="p-2 bg-white border border-red-200 rounded-lg text-red-500 hover:bg-red-50 shadow-sm transition-all"
                          title="Delete contact"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-4">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Company Intelligence</h3>
                 <div className="p-6 bg-indigo-900 rounded-2xl text-white relative overflow-hidden group">
                    <div className="relative z-10">
                      <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-1">Growth Forecast</p>
                      <h4 className="text-lg font-bold">+240% Potential Expansion</h4>
                      <p className="text-xs text-indigo-200 mt-2 max-w-xs">AI analysis suggests this account is expanding into Asian markets next quarter. Recommend increasing visibility services.</p>
                      <button className="mt-4 px-4 py-2 bg-white text-indigo-900 text-[10px] font-bold rounded-lg hover:bg-indigo-50 transition-all uppercase tracking-widest">Generate Strategy</button>
                    </div>
                    <Sparkles className="absolute -right-4 -bottom-4 w-24 h-24 text-indigo-800 opacity-20" />
                 </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-white flex gap-3">
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update Account
              </button>
              <button 
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="px-5 py-3 border border-slate-200 bg-white text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Company Modal */}
      {isEditModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-[80] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300" onClick={() => setIsEditModalOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl pointer-events-auto animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Edit Company</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">Update Company Details</p>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors shadow-sm">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleUpdateCompany(); }} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Company Name</label>
                  <input 
                    required
                    type="text" 
                    value={editFormData.name}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Industry</label>
                  <input 
                    type="text" 
                    value={editFormData.industry}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, industry: e.target.value }))}
                    placeholder="e.g., Shipping, Tech"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Website</label>
                  <input 
                    type="text" 
                    value={editFormData.website}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="example.com"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</label>
                  <input 
                    type="email" 
                    value={editFormData.email}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="company@example.com"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" 
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isUpdating}
                    className="flex-[2] py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Company'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && selectedCompany && (
        <div className="fixed inset-0 z-[80] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300" onClick={() => setIsDeleteConfirmOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl pointer-events-auto animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Delete Company</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">This action cannot be undone</p>
                  </div>
                </div>
                <button onClick={() => setIsDeleteConfirmOpen(false)} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors shadow-sm">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600">
                  Are you sure you want to delete <span className="font-bold text-slate-900">{selectedCompany.name}</span>?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-xs text-red-700 font-semibold mb-1">⚠️ Warning:</p>
                  <p className="text-xs text-red-600">
                    This will permanently delete the company and all {selectedCompanyContacts.length} contact(s) associated with it. This action cannot be undone.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsDeleteConfirmOpen(false)}
                    disabled={isDeleting}
                    className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDeleteCompany}
                    disabled={isDeleting}
                    className="flex-[2] py-3 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete Company
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Contact Confirmation Modal */}
      {isContactDeleteConfirmOpen && contactToDelete && (
        <div className="fixed inset-0 z-[80] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300" onClick={() => setIsContactDeleteConfirmOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl pointer-events-auto animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Delete Contact</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">This action cannot be undone</p>
                  </div>
                </div>
                <button onClick={() => setIsContactDeleteConfirmOpen(false)} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors shadow-sm">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600">
                  Are you sure you want to delete <span className="font-bold text-slate-900">{contactToDelete.name}</span>?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-xs text-red-700 font-semibold mb-1">⚠️ Warning:</p>
                  <p className="text-xs text-red-600">
                    This will permanently delete the contact and all associated data. This action cannot be undone.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsContactDeleteConfirmOpen(false);
                      setContactToDelete(null);
                    }}
                    disabled={isDeletingContact}
                    className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDeleteContact}
                    disabled={isDeletingContact}
                    className="flex-[2] py-3 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isDeletingContact ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete Contact
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

export default CRM;
