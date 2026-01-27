
import React, { useState, useEffect } from 'react';
import { 
  Building2, User, Globe, Phone, Mail, ChevronRight, Search, Plus, ExternalLink, 
  Calendar, Clock, Sparkles, ArrowRight, X, Trash2, Shield, Settings2, FileSearch, 
  Loader2, AlertTriangle, CheckSquare, ListChecks, Linkedin, Briefcase, TrendingUp,
  UserPlus, Newspaper, Rocket, Zap, Target, Save, Edit3, Wand2, Info, FileText, History,
  MessageSquare, UserCheck, Share2, MoreVertical
} from 'lucide-react';
import { Company, Contact, Deal, User as UserType, SocialSignal } from '../types';
import { apiGetCompanies, apiGetContacts, apiUpdateCompany, apiUpdateContact, apiDeleteCompany, apiDeleteContact, apiGetDeals, apiGetUsers } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { ImageWithFallback } from './common';
import { GoogleGenAI, Type } from '@google/genai';

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
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Editing state for Company
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [editCompanyFormData, setEditCompanyFormData] = useState<Partial<Company>>({});
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Editing state for Contact
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editContactFormData, setEditContactFormData] = useState<Partial<Contact>>({});
  const [activeContactTab, setActiveContactTab] = useState<'details' | 'notes' | 'activity'>('details');

  useEffect(() => {
    if (externalSearchQuery !== undefined) setLocalSearchQuery(externalSearchQuery);
  }, [externalSearchQuery]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [compRes, contRes, dealRes, userRes] = await Promise.all([
        apiGetCompanies(localSearchQuery.trim() || undefined),
        apiGetContacts(localSearchQuery.trim() || undefined),
        apiGetDeals(),
        apiGetUsers()
      ]);
      setCompanies(compRes.data || []);
      setContacts(contRes.data || []);
      setDeals(dealRes.data || []);
      setUsers(userRes.data || []);
    } catch (err) { showError('Failed to load data'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchData();
  }, [view, localSearchQuery]);

  useEffect(() => {
    const handleRefresh = () => fetchData();
    window.addEventListener('refresh-crm', handleRefresh);
    return () => window.removeEventListener('refresh-crm', handleRefresh);
  }, []);

  const handleUpdateCompany = async (updates: Partial<Company>) => {
    if (!selectedCompany) return;
    try {
      await apiUpdateCompany(selectedCompany.id, updates);
      setSelectedCompany({ ...selectedCompany, ...updates });
      setCompanies(prev => prev.map(c => c.id === selectedCompany.id ? { ...c, ...updates } : c));
      showSuccess('Account updated');
    } catch (err) { showError('Update failed'); }
  };

  const handleUpdateContactDetails = async () => {
    if (!selectedContact) return;
    try {
      await apiUpdateContact(selectedContact.id, editContactFormData);
      setSelectedContact({ ...selectedContact, ...editContactFormData });
      setContacts(prev => prev.map(c => c.id === selectedContact.id ? { ...c, ...editContactFormData } : c));
      setIsEditingContact(false);
      showSuccess('Contact updated successfully');
    } catch (err) { showError('Update failed'); }
  };

  const handleAiInsightLookup = async () => {
    if (!selectedCompany) return;
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Search for recent business news, funding rounds, new hires, and acquisitions for the company "${selectedCompany.name}" (Website: ${selectedCompany.website}). Provide exactly 3 high-value social signals.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['funding', 'hiring', 'acquisition', 'news'] },
                date: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ['title', 'type', 'date', 'description']
            }
          }
        }
      });

      const signals: any[] = JSON.parse(response.text || '[]');
      const formattedSignals: SocialSignal[] = signals.map((s, i) => ({
        id: `ai-${Date.now()}-${i}`,
        ...s,
        isAiGenerated: true
      }));

      const newSignals = [...formattedSignals, ...(selectedCompany.socialSignals || [])];
      await handleUpdateCompany({ socialSignals: newSignals });
      showSuccess('AI Intelligence Refresh Complete');
    } catch (err) {
      console.error(err);
      showError('AI lookup unavailable');
    } finally {
      setIsAiLoading(false);
    }
  };

  const getCompanyDealsCount = (companyId: string) => {
    return deals.filter(d => d.companyId === companyId && d.stage !== 'Won' && d.stage !== 'Lost').length;
  };

  const getOwnerName = (ownerId?: string) => {
    if (!ownerId) return 'Unassigned';
    return users.find(u => u.id === ownerId)?.name || 'Unknown';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">CRM</h1>
          <div className="flex gap-4 mt-2">
            <button onClick={() => setView('companies')} className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${view === 'companies' ? 'border-indigo-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Companies ({companies.length})</button>
            <button onClick={() => setView('contacts')} className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${view === 'contacts' ? 'border-indigo-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Contacts ({contacts.length})</button>
          </div>
        </div>
        <button onClick={() => view === 'companies' ? onAddCompany() : onAddContact()} className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-sm">
          <Plus className="w-4 h-4" /> Add {view === 'companies' ? 'Company' : 'Contact'}
        </button>
      </div>

      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
        <input type="text" placeholder={`Search ${view}...`} value={localSearchQuery} onChange={(e) => setLocalSearchQuery(e.target.value)} className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-indigo-100 transition-all" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {view === 'companies' ? (
            companies.map(company => {
              const owner = users.find(u => u.id === company.ownerId);
              return (
                <div key={company.id} onClick={() => setSelectedCompany(company)} className={`bg-white p-6 rounded-2xl border ${company.isTargetAccount ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.1)]' : 'border-slate-200'} hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group flex flex-col h-full relative`}>
                  {company.isTargetAccount && <div className="absolute -top-3 left-6 px-2 py-0.5 bg-amber-500 text-white text-[9px] font-black uppercase rounded shadow-sm flex items-center gap-1"><Target className="w-2.5 h-2.5" /> Target Account</div>}
                  <div className="flex items-center gap-4 mb-6">
                    <ImageWithFallback src={company.logo} fallbackText={company.name} className="w-12 h-12 border border-slate-100" isAvatar={false} />
                    <div className="flex-1 overflow-hidden">
                      <h3 className="font-bold text-lg text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{company.name}</h3>
                      <p className="text-slate-500 text-xs font-bold uppercase">{company.industry}</p>
                    </div>
                  </div>
                  <div className="space-y-3 mb-6 flex-1 text-sm text-slate-600">
                    <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-slate-400" /><span className="truncate">{company.website || 'No website'}</span></div>
                    <div className="flex items-center gap-2"><User className="w-4 h-4 text-slate-400" /><span className="truncate font-medium">{owner?.name || 'Unassigned'}</span></div>
                  </div>
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{getCompanyDealsCount(company.id)} Active Deals</span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              );
            })
          ) : (
            contacts.map(contact => {
              const company = companies.find(c => c.id === contact.companyId);
              return (
                <div key={contact.id} className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group shadow-sm">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xl uppercase shadow-inner">{contact.name.charAt(0)}</div>
                    <div className="flex-1 overflow-hidden">
                      <h3 className="font-bold text-lg text-slate-900 truncate">{contact.name}</h3>
                      <p className="text-slate-500 text-xs font-bold uppercase truncate">{contact.role} @ {company?.name || 'Partner'}</p>
                    </div>
                  </div>
                  <div className="space-y-3 mb-6 text-sm text-slate-600">
                    <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /><span className="truncate text-indigo-600">{contact.email}</span></div>
                    <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" /><span>{contact.phone}</span></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedContact(contact)} className="flex-1 py-2.5 bg-slate-50 text-slate-600 text-[10px] font-black rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors uppercase tracking-widest">Open Profile</button>
                    {contact.linkedin && <a href={contact.linkedin} target="_blank" rel="noreferrer" className="px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"><Linkedin className="w-4 h-4" /></a>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Company Detail Drawer */}
      {selectedCompany && (
        <div className="fixed inset-0 z-[70] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300" onClick={() => { setSelectedCompany(null); setIsEditingCompany(false); }} />
          <div className="absolute right-0 inset-y-0 w-full max-w-2xl bg-white shadow-2xl pointer-events-auto animate-in slide-in-from-right duration-500 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <ImageWithFallback src={selectedCompany.logo} fallbackText={selectedCompany.name} className="w-12 h-12 border border-slate-200" isAvatar={false} />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">{selectedCompany.name}</h2>
                    <button onClick={() => handleUpdateCompany({ isTargetAccount: !selectedCompany.isTargetAccount })} className={`p-1 rounded-lg transition-all ${selectedCompany.isTargetAccount ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50'}`} title="Mark as Target Account"><Target className="w-5 h-5" /></button>
                  </div>
                  <p className="text-xs text-slate-500">{selectedCompany.industry}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isEditingCompany ? (
                  <button onClick={async () => { await handleUpdateCompany(editCompanyFormData); setIsEditingCompany(false); }} className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg"><Save className="w-5 h-5" /></button>
                ) : (
                  <button onClick={() => { setEditCompanyFormData({ ...selectedCompany }); setIsEditingCompany(true); }} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><Edit3 className="w-5 h-5" /></button>
                )}
                <button onClick={() => { setSelectedCompany(null); setIsEditingCompany(false); }} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-10">
              {isEditingCompany ? (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Company Name</label>
                    <input type="text" value={editCompanyFormData.name} onChange={e => setEditCompanyFormData({...editCompanyFormData, name: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Industry</label>
                    <input type="text" value={editCompanyFormData.industry} onChange={e => setEditCompanyFormData({...editCompanyFormData, industry: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Owner</label>
                    <select value={editCompanyFormData.ownerId} onChange={e => setEditCompanyFormData({...editCompanyFormData, ownerId: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                      <option value="">Unassigned</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Website</label>
                    <input type="text" value={editCompanyFormData.website} onChange={e => setEditCompanyFormData({...editCompanyFormData, website: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">LinkedIn</label>
                    <input type="text" value={editCompanyFormData.linkedin} onChange={e => setEditCompanyFormData({...editCompanyFormData, linkedin: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Account Manager</p>
                    <span className="text-sm font-bold text-indigo-600 flex items-center gap-2"><User className="w-4 h-4" /> {getOwnerName(selectedCompany.ownerId)}</span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${selectedCompany.isTargetAccount ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {selectedCompany.isTargetAccount ? 'Target Account' : 'Standard Account'}
                    </span>
                  </div>
                </div>
              )}

              {/* Social Signals Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" /> Social Signals & Intelligence
                  </h3>
                  <button onClick={handleAiInsightLookup} disabled={isAiLoading} className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-100 transition-all disabled:opacity-50">
                    {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} Execute Intelligence Scan
                  </button>
                </div>
                <div className="space-y-3">
                  {isAiLoading && (
                    <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-indigo-200 flex flex-col items-center justify-center text-center">
                       <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
                       <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest">Scanning global digital signals...</p>
                    </div>
                  )}
                  {(!selectedCompany.socialSignals || selectedCompany.socialSignals.length === 0) && !isAiLoading ? (
                    <div className="py-12 text-center text-slate-400"><TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-10" /><p className="text-xs font-medium">No signals found. Use AI Scan to refresh intelligence.</p></div>
                  ) : (selectedCompany.socialSignals || []).map(signal => (
                    <div key={signal.id} className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 transition-all shadow-sm group">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${signal.type === 'funding' ? 'bg-emerald-50 text-emerald-600' : signal.type === 'hiring' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                            {signal.type === 'funding' && <Rocket className="w-4 h-4" />}
                            {signal.type === 'hiring' && <UserPlus className="w-4 h-4" />}
                            {signal.type === 'acquisition' && <Zap className="w-4 h-4" />}
                            {signal.type === 'news' && <Newspaper className="w-4 h-4" />}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-slate-900">{signal.title}</h4>
                            {signal.isAiGenerated && <span className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter flex items-center gap-1"><Sparkles className="w-2 h-2" /> Verified by Impact AI</span>}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{signal.date}</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{signal.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Active Contacts</h3>
                <div className="space-y-3">
                  {contacts.filter(c => c.companyId === selectedCompany.id).map(contact => (
                    <div key={contact.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:border-indigo-200 transition-all cursor-pointer" onClick={() => setSelectedContact(contact)}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-xs font-black text-indigo-600 uppercase">{contact.name.charAt(0)}</div>
                        <div><p className="text-sm font-bold text-slate-900">{contact.name}</p><p className="text-[10px] text-slate-500 font-bold uppercase">{contact.role}</p></div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sophisticated Contact Profile Drawer */}
      {selectedContact && (
        <div className="fixed inset-0 z-[75] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md pointer-events-auto animate-in fade-in duration-300" onClick={() => { setSelectedContact(null); setIsEditingContact(false); }} />
          <div className="absolute right-0 inset-y-0 w-full max-w-xl bg-white shadow-2xl pointer-events-auto animate-in slide-in-from-right duration-500 flex flex-col">
            
            {/* Business Card Header */}
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 relative">
              <button onClick={() => { setSelectedContact(null); setIsEditingContact(false); }} className="absolute top-6 right-6 p-2 hover:bg-white rounded-full text-slate-400 transition-all shadow-sm z-10"><X className="w-5 h-5" /></button>
              
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-indigo-100 ring-4 ring-indigo-50 shrink-0">
                  {selectedContact.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-black text-slate-900 truncate mb-1">{selectedContact.name}</h2>
                  <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest truncate">
                    {selectedContact.role} @ {companies.find(c => c.id === selectedContact.companyId)?.name || 'Direct Contact'}
                  </p>
                  
                  <div className="flex gap-2 mt-4">
                    {!isEditingContact ? (
                      <button onClick={() => { setEditContactFormData({...selectedContact}); setIsEditingContact(true); }} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 hover:border-indigo-300 transition-all flex items-center gap-2"><Edit3 className="w-3.5 h-3.5" /> Edit Profile</button>
                    ) : (
                      <button onClick={handleUpdateContactDetails} className="px-4 py-2 bg-indigo-600 border border-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest text-white hover:bg-indigo-700 transition-all flex items-center gap-2"><Save className="w-3.5 h-3.5" /> Save Changes</button>
                    )}
                    <a href={`mailto:${selectedContact.email}`} className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"><Mail className="w-4 h-4" /></a>
                    {selectedContact.linkedin && <a href={selectedContact.linkedin} target="_blank" rel="noreferrer" className="p-2.5 bg-[#0077b5] text-white rounded-xl hover:bg-[#006da5] transition-all shadow-lg shadow-blue-100"><Linkedin className="w-4 h-4" /></a>}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit mt-8">
                {[
                  { id: 'details', label: 'Overview', icon: <Info className="w-3.5 h-3.5" /> },
                  { id: 'notes', label: 'Strategic Context', icon: <FileText className="w-3.5 h-3.5" /> },
                  { id: 'activity', label: 'History', icon: <History className="w-3.5 h-3.5" /> },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveContactTab(tab.id as any); setIsEditingContact(false); }}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      activeContactTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {activeContactTab === 'details' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {isEditingContact ? (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Legal Name</label>
                          <input type="text" value={editContactFormData.name} onChange={e => setEditContactFormData({...editContactFormData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-50" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Professional Role</label>
                          <input type="text" value={editContactFormData.role} onChange={e => setEditContactFormData({...editContactFormData, role: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-50" />
                        </div>
                      </div>
                      
                      <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-6">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-200 pb-2">Communication Registry</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Enterprise Email</label>
                            <input type="email" value={editContactFormData.email} onChange={e => setEditContactFormData({...editContactFormData, email: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Mobile Contact</label>
                            <input type="tel" value={editContactFormData.phone} onChange={e => setEditContactFormData({...editContactFormData, phone: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold" />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">LinkedIn Intelligence URL</label>
                            <input type="url" value={editContactFormData.linkedin} onChange={e => setEditContactFormData({...editContactFormData, linkedin: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 flex flex-col justify-between group hover:bg-white hover:border-indigo-200 transition-all shadow-sm">
                           <div className="flex justify-between items-start mb-4">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact Channel</p>
                              <Mail className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                           </div>
                           <p className="text-sm font-black text-slate-900 truncate">{selectedContact.email}</p>
                           <p className="text-[10px] text-indigo-500 font-bold uppercase mt-2">Verified Enterprise Mail</p>
                        </div>
                        <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 flex flex-col justify-between group hover:bg-white hover:border-indigo-200 transition-all shadow-sm">
                           <div className="flex justify-between items-start mb-4">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Voice Registry</p>
                              <Phone className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                           </div>
                           <p className="text-sm font-black text-slate-900">{selectedContact.phone || 'Registry Pending'}</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Direct Terminal</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Building2 className="w-4 h-4 text-indigo-500" /> Account Context</h3>
                        <div className="p-6 bg-white border border-slate-100 rounded-[36px] shadow-sm flex items-center gap-5 hover:border-indigo-300 transition-all group">
                          <ImageWithFallback src={companies.find(c => c.id === selectedContact.companyId)?.logo} className="w-16 h-16 border-2 border-slate-50" fallbackText="C" isAvatar={false} />
                          <div className="flex-1">
                             <p className="font-black text-lg text-slate-900 leading-none mb-1 group-hover:text-indigo-600 transition-colors">{companies.find(c => c.id === selectedContact.companyId)?.name || 'Independent Partner'}</p>
                             <div className="flex items-center gap-2">
                               <span className="text-[10px] text-slate-400 font-black uppercase">{companies.find(c => c.id === selectedContact.companyId)?.industry || 'Uncategorized'}</span>
                               <span className="w-1 h-1 rounded-full bg-slate-200" />
                               <span className="text-[10px] text-indigo-500 font-black uppercase">Primary Stakeholder</span>
                             </div>
                          </div>
                          <button className="p-3 text-indigo-600 bg-indigo-50 rounded-2xl hover:bg-indigo-100 transition-all"><ExternalLink className="w-5 h-5" /></button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500" /> Intelligence Summary</h3>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex items-center gap-3">
                              <UserCheck className="w-5 h-5 text-emerald-600" />
                              <div>
                                 <p className="text-[10px] font-black text-emerald-600 uppercase">Influence</p>
                                 <p className="text-xs font-bold text-slate-900">Decision Maker</p>
                              </div>
                           </div>
                           <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center gap-3">
                              <Share2 className="w-5 h-5 text-blue-600" />
                              <div>
                                 <p className="text-[10px] font-black text-blue-600 uppercase">Network</p>
                                 <p className="text-xs font-bold text-slate-900">Executive Hub</p>
                              </div>
                           </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeContactTab === 'notes' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Internal Collaboration Insights</h3>
                    {isEditingContact && <span className="text-[10px] font-black text-indigo-500 uppercase flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /> Edit Mode Active</span>}
                  </div>
                  {isEditingContact ? (
                    <textarea 
                      value={editContactFormData.notes} 
                      onChange={e => setEditContactFormData({...editContactFormData, notes: e.target.value})} 
                      placeholder="Add strategic context, decision-making patterns, or meeting insights about this contact..." 
                      className="w-full p-8 bg-slate-50 border border-slate-200 rounded-[40px] text-sm text-slate-700 min-h-[300px] outline-none focus:ring-8 focus:ring-indigo-50 transition-all font-medium leading-relaxed resize-none"
                    />
                  ) : (
                    <div className="p-10 bg-slate-950 rounded-[48px] text-indigo-50 relative overflow-hidden group shadow-2xl">
                      <p className="text-base leading-relaxed italic opacity-90 z-10 relative">
                        {selectedContact.notes || "No operational intelligence is currently archived for this stakeholder. Team registry update is pending for Q4 sync."}
                      </p>
                      <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
                      <div className="absolute bottom-4 right-8 z-10">
                         <MessageSquare className="w-10 h-10 text-white/5" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeContactTab === 'activity' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Operational Engagement Timeline</h3>
                    <button className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 px-3 py-1.5 rounded-xl hover:bg-slate-200 transition-all flex items-center gap-1.5"><FileSearch className="w-3 h-3" /> Audit Log</button>
                  </div>
                  <div className="relative border-l-2 border-slate-100 ml-4 pl-10 space-y-12">
                     <div className="relative">
                       <div className="absolute -left-[51px] top-1.5 w-8 h-8 rounded-full bg-white border-2 border-indigo-600 shadow-xl flex items-center justify-center">
                         <div className="w-2 h-2 rounded-full bg-indigo-600" />
                       </div>
                       <p className="text-[10px] font-black text-indigo-600 uppercase mb-1 tracking-widest">Digital Touchpoint • Yesterday</p>
                       <h4 className="text-sm font-black text-slate-900">Enterprise Email Receipt</h4>
                       <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-sm">Confirmed receipt of Logistics Transformation Proposal V3. Stakeholder requested EMEA regional review by Friday.</p>
                     </div>
                     <div className="relative">
                       <div className="absolute -left-[51px] top-1.5 w-8 h-8 rounded-full bg-white border-2 border-slate-200 shadow-sm flex items-center justify-center">
                         <div className="w-2 h-2 rounded-full bg-slate-300" />
                       </div>
                       <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">Registry Update • Last Week</p>
                       <h4 className="text-sm font-black text-slate-900">Registry Association Linked</h4>
                       <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-sm">Manually associated with the 'Q4 Global Logistics Consolidation' opportunity by Alex Rivera (Admin).</p>
                     </div>
                  </div>
                </div>
              )}
            </div>

            {/* Premium Footer */}
            <div className="p-8 border-t border-slate-100 bg-white flex gap-4">
              <button 
                onClick={() => { if(confirm('Are you sure you want to permanently delete this contact from the enterprise registry?')) { apiDeleteContact(selectedContact.id).then(() => { setSelectedContact(null); fetchData(); }); } }} 
                className="px-6 py-4 border border-slate-200 bg-white text-red-500 hover:bg-red-50 rounded-[28px] transition-all group shrink-0 active:scale-95"
              >
                <Trash2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
              <button onClick={() => { setSelectedContact(null); setIsEditingContact(false); }} className="flex-1 py-4 bg-slate-900 text-white font-black uppercase text-xs tracking-[0.25em] rounded-[28px] hover:bg-indigo-700 active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-3">
                <UserCheck className="w-5 h-5" /> Finalize Profile Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRM;
