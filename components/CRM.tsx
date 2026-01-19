
import React, { useState, useEffect } from 'react';
import { MOCK_COMPANIES, MOCK_CONTACTS, MOCK_DEALS } from '../constants';
import { Building2, User, Globe, Phone, Mail, ChevronRight, Search, Plus, ExternalLink, Calendar, Clock, Sparkles, ArrowRight, X, Trash2, Shield, Settings2, FileSearch } from 'lucide-react';
import { Company, Contact } from '../types';

interface CRMProps {
  onNavigate: (tab: string) => void;
  onAddCompany: () => void;
  onAddContact: () => void;
  externalSearchQuery?: string;
}

const CRM: React.FC<CRMProps> = ({ onNavigate, onAddCompany, onAddContact, externalSearchQuery = '' }) => {
  const [view, setView] = useState<'companies' | 'contacts'>('companies');
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // Sync external search query from App header if provided
  useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setLocalSearchQuery(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  const getCompanyDealsCount = (companyId: string) => {
    return MOCK_DEALS.filter(d => d.companyId === companyId).length;
  };

  const generateEmailFromName = (name: string, domain: string) => {
    const formattedName = name.toLowerCase().replace(/\s+/g, '.');
    return `${formattedName}@${domain}`;
  };

  const query = localSearchQuery.toLowerCase();

  const filteredCompanies = MOCK_COMPANIES.filter(c => 
    c.name.toLowerCase().includes(query) ||
    c.industry.toLowerCase().includes(query) ||
    c.website.toLowerCase().includes(query)
  );

  const filteredContacts = MOCK_CONTACTS.filter(c => {
    const company = MOCK_COMPANIES.find(comp => comp.id === c.companyId);
    return (
      c.name.toLowerCase().includes(query) ||
      c.role.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query) ||
      c.phone.includes(query) ||
      (company && company.name.toLowerCase().includes(query))
    );
  });

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
          onClick={view === 'companies' ? onAddCompany : onAddContact}
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

      {!hasResults ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-slate-300 rounded-2xl animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
            <FileSearch className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No {view} match "{localSearchQuery}"</h3>
          <p className="text-slate-500 text-sm mt-1">Try a different search term or add a new record.</p>
          <button 
            onClick={() => setLocalSearchQuery('')}
            className="mt-6 text-indigo-600 font-bold text-sm hover:underline"
          >
            Clear Search
          </button>
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
                  <img src={company.logo} alt={company.name} className="w-12 h-12 rounded-lg border border-slate-100 shadow-sm" />
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
              const company = MOCK_COMPANIES.find(c => c.id === contact.companyId);
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
                      <span>Last contacted: {contact.lastContacted}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 py-2 bg-slate-50 text-slate-600 text-[10px] font-bold rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors uppercase tracking-widest">
                      Timeline
                    </button>
                    <button className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                      <Mail className="w-4 h-4" />
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
                <img src={selectedCompany.logo} className="w-12 h-12 rounded-xl border border-slate-200 shadow-sm" />
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
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contacts ({MOCK_CONTACTS.filter(c => c.companyId === selectedCompany.id).length})</h3>
                  <button onClick={onAddContact} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Contact
                  </button>
                </div>
                <div className="space-y-3">
                  {MOCK_CONTACTS.filter(c => c.companyId === selectedCompany.id).map(contact => (
                    <div key={contact.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-400 uppercase">{contact.name.charAt(0)}</div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{contact.name}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{contact.role}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 shadow-sm transition-all"><Mail className="w-3.5 h-3.5" /></button>
                        <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 shadow-sm transition-all"><Phone className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
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
              <button className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">Update Account</button>
              <button className="px-5 py-3 border border-slate-200 bg-white text-red-500 hover:bg-red-50 rounded-xl transition-all">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRM;
