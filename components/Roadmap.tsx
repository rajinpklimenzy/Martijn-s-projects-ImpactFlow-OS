
import React, { useState, useEffect } from 'react';
import { 
  Map, Sparkles, Bug, Lightbulb, CheckCircle2, Clock, 
  PauseCircle, XCircle, MoreVertical, Search, Filter, 
  Loader2, AlertTriangle, ChevronRight, Box, History,
  X, User, Calendar, MessageSquare, Tag, Layout, ArrowRight,
  Trash2, Mail, Zap, Plus, Send, Archive
} from 'lucide-react';
import { FeedbackItem, User as UserType } from '../types';
import { apiGetFeedback, apiCreateFeedback, apiUpdateFeedback, apiDeleteFeedback, apiGetUsers } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import Inbox from './Inbox';
import Automations from './Automations';

const Roadmap: React.FC<{ currentUser: any, onNavigate?: (tab: string) => void }> = ({ currentUser, onNavigate }) => {
  const { showSuccess, showError } = useToast();
  const [activeSection, setActiveSection] = useState<'registry' | 'inbox' | 'automation'>('registry');
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'bug' | 'feature' | 'idea'>('all');
  const [view, setView] = useState<'open' | 'completed'>('open');
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: 'feature' as 'bug' | 'feature' | 'idea',
    title: '',
    description: ''
  });
  const [confirmAction, setConfirmAction] = useState<{
    type: 'done' | 'archive' | 'in-execution' | null;
    item: FeedbackItem | null;
  }>({ type: null, item: null });
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<FeedbackItem | null>(null);

  const isAdmin = currentUser?.role === 'Admin';

  const fetchData = async () => {
    if (activeSection !== 'registry') return;
    setIsLoading(true);
    try {
      const [feedRes, userRes] = await Promise.all([
        apiGetFeedback(),
        apiGetUsers()
      ]);
      setItems(feedRes.data || []);
      setUsers(userRes.data || []);
    } catch (err) {
      showError('Failed to synchronize roadmap registry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleRefresh = () => fetchData();
    window.addEventListener('refresh-roadmap', handleRefresh);
    return () => window.removeEventListener('refresh-roadmap', handleRefresh);
  }, [activeSection]);

  const handleStatusUpdate = async (id: string, newStatus: FeedbackItem['status']) => {
    if (!isAdmin) return;
    try {
      await apiUpdateFeedback(id, { status: newStatus });
      setItems(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
      if (selectedItem?.id === id) {
        setSelectedItem({ ...selectedItem, status: newStatus });
      }
      showSuccess(`Status updated to ${newStatus}`);
    } catch (err) {
      showError('Update failed.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    try {
      await apiDeleteFeedback(id);
      setItems(prev => prev.filter(item => item.id !== id));
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
      setDeleteConfirmItem(null);
      showSuccess('Entry purged from registry.');
    } catch (err) {
      showError('Purge failed.');
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      showError('Title and description are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        userId: currentUser?.id || 'anonymous',
        status: 'planned' as const
      };
      
      await apiCreateFeedback(payload);
      
      showSuccess('Entry added to Strategic Pipeline');
      setIsAddModalOpen(false);
      setFormData({ type: 'feature', title: '', description: '' });
      
      // Refresh the list
      fetchData();
    } catch (err: any) {
      console.error('[FEEDBACK] Creation failed:', err);
      showError(`Failed to add entry: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction.item || !confirmAction.type) return;

    let newStatus: FeedbackItem['status'];
    let successMessage: string;
    
    switch (confirmAction.type) {
      case 'done':
        newStatus = 'done';
        successMessage = 'Entry marked as done';
        break;
      case 'archive':
        newStatus = 'canceled';
        successMessage = 'Entry archived';
        break;
      case 'in-execution':
        newStatus = 'in-progress';
        successMessage = 'Entry marked as in execution';
        break;
      default:
        return;
    }
    
    try {
      await apiUpdateFeedback(confirmAction.item.id, { status: newStatus });
      setItems(prev => prev.map(item => 
        item.id === confirmAction.item!.id ? { ...item, status: newStatus } : item
      ));
      if (selectedItem?.id === confirmAction.item.id) {
        setSelectedItem({ ...selectedItem, status: newStatus });
      }
      showSuccess(successMessage);
      setConfirmAction({ type: null, item: null });
    } catch (err) {
      showError('Failed to update entry status');
    }
  };

  const getStatusIcon = (status: FeedbackItem['status'], size = "w-4 h-4") => {
    switch (status) {
      case 'done': return <CheckCircle2 className={`${size} text-emerald-500`} />;
      case 'in-progress': return <Clock className={`${size} text-blue-500 animate-pulse`} />;
      case 'postponed': return <PauseCircle className={`${size} text-amber-500`} />;
      case 'canceled': return <XCircle className={`${size} text-slate-400`} />;
      default: return <Map className={`${size} text-indigo-400`} />;
    }
  };

  const getTypeStyle = (type: FeedbackItem['type']) => {
    switch (type) {
      case 'bug': return 'bg-red-50 text-red-600 border-red-100';
      case 'feature': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'idea': return 'bg-amber-50 text-amber-600 border-amber-100';
    }
  };

  const getTypeIcon = (type: FeedbackItem['type'], size = "w-4 h-4") => {
    switch (type) {
      case 'bug': return <Bug className={size} />;
      case 'feature': return <Sparkles className={size} />;
      case 'idea': return <Lightbulb className={size} />;
    }
  };

  const filteredItems = items.filter(item => {
    const statusMatch = view === 'open' ? item.status !== 'done' && item.status !== 'canceled' : item.status === 'done' || item.status === 'canceled';
    if (!statusMatch) return false;
    if (filter === 'all') return true;
    return item.type === filter;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24 relative h-full">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Enterprise Roadmap</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Consolidated future trajectory, communication beta, and workflow automation</p>
        </div>

        {/* Top Level Navigation Hub */}
        <div className="flex bg-white p-1.5 rounded-[24px] border border-slate-200 shadow-sm w-fit">
          {[
            { id: 'registry', label: 'Trajectory Registry', icon: <Map className="w-4 h-4" /> },
            { id: 'inbox', label: 'Shared Inbox', icon: <Mail className="w-4 h-4" />, badge: 'Soon' },
            { id: 'automation', label: 'Smart Automations', icon: <Zap className="w-4 h-4" />, badge: 'Beta' },
          ].map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id as any)}
              className={`flex items-center gap-3 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeSection === sec.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              {sec.icon} {sec.label}
              {sec.badge && <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[8px] font-black ${activeSection === sec.id ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-500'}`}>{sec.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      {activeSection === 'registry' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="flex items-center gap-3 bg-white p-1.5 rounded-[20px] border border-slate-200 shadow-sm">
               <button 
                 onClick={() => setView('open')} 
                 className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'open' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 Strategic Pipeline
               </button>
               <button 
                 onClick={() => setView('completed')} 
                 className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'completed' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 Archive & Done
               </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {(['all', 'bug', 'feature', 'idea'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${filter === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-400'}`}
                >
                  {f}
                </button>
              ))}
              <button
                onClick={() => {
                  // Pre-select classification based on current filter
                  const typeMap: { [key: string]: 'bug' | 'feature' | 'idea' } = {
                    'bug': 'bug',
                    'feature': 'feature',
                    'idea': 'idea'
                  };
                  const preSelectedType = filter !== 'all' ? typeMap[filter] : 'feature';
                  setFormData({ type: preSelectedType, title: '', description: '' });
                  setIsAddModalOpen(true);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2"
              >
                <Plus className="w-3 h-3" /> New Entry
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32"><Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" /><p className="text-xs font-black text-slate-400 uppercase tracking-widest">Synchronizing Registry...</p></div>
          ) : filteredItems.length === 0 ? (
            <div className="py-32 bg-white rounded-[40px] border border-dashed border-slate-200 text-center flex flex-col items-center justify-center gap-4">
               <Box className="w-16 h-16 text-slate-100" />
               <div>
                 <p className="text-lg font-black text-slate-900">No Registry Entries Found</p>
                 <p className="text-xs text-slate-400 font-medium mb-4">Add a new strategic entry to get started.</p>
                 <button
                   onClick={() => {
                     // Pre-select classification based on current filter
                     const typeMap: { [key: string]: 'bug' | 'feature' | 'idea' } = {
                       'bug': 'bug',
                       'feature': 'feature',
                       'idea': 'idea'
                     };
                     const preSelectedType = filter !== 'all' ? typeMap[filter] : 'feature';
                     setFormData({ type: preSelectedType, title: '', description: '' });
                     setIsAddModalOpen(true);
                   }}
                   className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2 mx-auto"
                 >
                   <Plus className="w-4 h-4" /> Add Entry
                 </button>
               </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map(item => {
                const author = users.find(u => u.id === item.userId);
                return (
                  <div 
                    key={item.id} 
                    onClick={() => setSelectedItem(item)}
                    className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm hover:border-indigo-300 hover:shadow-xl transition-all group flex flex-col relative overflow-hidden cursor-pointer active:scale-[0.98] hover:scale-[1.02]"
                  >
                    {/* Admin Status Menu Overlay (if Admin) */}
                    {isAdmin && (
                       <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                         <div className="relative group/menu">
                           <button 
                             onClick={(e) => { e.stopPropagation(); }} 
                             className="p-2 hover:bg-slate-50 rounded-xl text-slate-400"
                           >
                             <MoreVertical className="w-5 h-5" />
                           </button>
                           <div className="absolute right-0 top-full mt-1 w-48 bg-slate-900 rounded-2xl shadow-2xl overflow-hidden z-20 invisible group-hover/menu:visible opacity-0 group-hover/menu:opacity-100 transition-all">
                             <div className="p-2 border-b border-white/5 text-[9px] font-black text-white/40 uppercase tracking-widest px-4 py-2">Lifecycle Management</div>
                             {(['planned', 'in-progress', 'done', 'postponed', 'canceled'] as FeedbackItem['status'][]).map(s => (
                               <button 
                                 key={s} 
                                 onClick={(e) => { e.stopPropagation(); handleStatusUpdate(item.id, s); }} 
                                 className={`w-full px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest transition-colors ${item.status === s ? 'text-indigo-400' : 'text-slate-300 hover:bg-white/5'}`}
                               >
                                 Set {s}
                               </button>
                             ))}
                             <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="w-full px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-red-400 border-t border-white/5 hover:bg-red-500 hover:text-white transition-all">Delete Terminal</button>
                           </div>
                         </div>
                       </div>
                    )}

                    <div className="flex justify-between items-start mb-6">
                       <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border ${getTypeStyle(item.type)} flex items-center gap-1.5`}>
                         {getTypeIcon(item.type, "w-2.5 h-2.5")}
                         {item.type}
                       </div>
                       <div className="flex items-center gap-2">
                         <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full text-[9px] font-black text-slate-500 uppercase">
                           {getStatusIcon(item.status, "w-2.5 h-2.5")}
                           {item.status}
                         </div>
                         {(item.status === 'planned' || item.status === 'in-progress' || item.status === 'postponed') && (
                           <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                             {item.status !== 'in-progress' && (
                               <button
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setConfirmAction({ type: 'in-execution', item });
                                 }}
                                 className="px-2 py-1 hover:bg-blue-50 rounded-lg text-blue-600 transition-all group border border-blue-100 hover:border-blue-200"
                                 title="Mark as In Execution"
                               >
                                 <Clock className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                               </button>
                             )}
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setConfirmAction({ type: 'done', item });
                               }}
                               className="px-2 py-1 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-all group border border-emerald-100 hover:border-emerald-200"
                               title="Mark as Done"
                             >
                               <CheckCircle2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                             </button>
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setConfirmAction({ type: 'archive', item });
                               }}
                               className="px-2 py-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-all group border border-slate-200 hover:border-slate-300"
                               title="Archive"
                             >
                               <Archive className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                             </button>
                           </div>
                         )}
                       </div>
                    </div>

                    <h3 className="text-lg font-black text-slate-900 mb-3 leading-tight group-hover:text-indigo-600 transition-colors">{item.title}</h3>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8 flex-1 line-clamp-3 italic">"{item.description}"</p>

                    <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-black text-xs uppercase shadow-inner group-hover:scale-110 transition-transform">
                            {author?.name?.charAt(0) || 'U'}
                         </div>
                         <div>
                           <p className="text-xs font-black text-slate-900">{author?.name || 'Observer'}</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(item.createdAt).toLocaleDateString()}</p>
                         </div>
                       </div>
                       <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-12">
            {[
              { label: 'Total Requests', value: items.length, icon: <Map className="w-4 h-4" /> },
              { label: 'Bugs Identified', value: items.filter(i => i.type === 'bug').length, icon: <Bug className="w-4 h-4 text-red-500" /> },
              { label: 'Features Shipped', value: items.filter(i => i.status === 'done').length, icon: <Sparkles className="w-4 h-4 text-emerald-500" /> },
              { label: 'In Execution', value: items.filter(i => i.status === 'in-progress').length, icon: <Clock className="w-4 h-4 text-blue-500" /> }
            ].map((stat, i) => (
              <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                 <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">{stat.icon}</div>
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                   <p className="text-xl font-black text-slate-900">{stat.value}</p>
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === 'inbox' && <div className="animate-in slide-in-from-right-4 duration-500"><Inbox /></div>}
      {activeSection === 'automation' && <div className="animate-in slide-in-from-right-4 duration-500"><Automations /></div>}

      {/* Add Entry Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                  <Plus className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">New Registry Entry</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black mt-2">Strategic Pipeline</p>
                </div>
              </div>
              <button onClick={() => { setIsAddModalOpen(false); setFormData({ type: 'feature', title: '', description: '' }); }} className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-slate-200">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAddEntry} className="flex-1 overflow-y-auto p-10 custom-scrollbar">
              <div className="space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Classification</label>
                  <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                    {[
                      { id: 'bug', icon: <Bug className="w-4 h-4" />, label: 'Bug', color: 'bg-red-50 text-red-600 border-red-200' },
                      { id: 'feature', icon: <Sparkles className="w-4 h-4" />, label: 'Feature', color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
                      { id: 'idea', icon: <Lightbulb className="w-4 h-4" />, label: 'Idea', color: 'bg-amber-50 text-amber-600 border-amber-200' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setFormData({...formData, type: tab.id as any})}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all border ${
                          formData.type === tab.id 
                            ? `${tab.color} shadow-md` 
                            : 'bg-white text-slate-400 border-transparent hover:text-slate-600'
                        }`}
                      >
                        {tab.icon} {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Title *</label>
                  <input 
                    required
                    type="text"
                    placeholder="Enter entry title..."
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Description *</label>
                  <textarea 
                    required
                    rows={6}
                    placeholder="Provide detailed context and strategic notes..."
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[20px] text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-50 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-8 mt-8 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setFormData({ type: 'feature', title: '', description: '' }); }} 
                  className="flex-1 py-4 border border-slate-200 text-slate-400 font-black uppercase text-xs tracking-widest rounded-[24px] hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting || !formData.title || !formData.description}
                  className="flex-[2] py-4 bg-indigo-600 text-white font-black uppercase text-xs tracking-[0.2em] rounded-[24px] hover:bg-indigo-700 transition-all shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Adding...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" /> Add to Pipeline
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Viewing Drawer (Persistent for Registry) */}
      {selectedItem && (
        <div className="fixed inset-0 z-[110] overflow-hidden pointer-events-none">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md pointer-events-auto animate-in fade-in duration-300" 
            onClick={() => setSelectedItem(null)} 
          />
          <div className="absolute right-0 inset-y-0 w-full max-w-xl bg-white shadow-2xl pointer-events-auto animate-in slide-in-from-right duration-500 flex flex-col">
            
            {/* Header */}
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 relative">
              <button 
                onClick={() => setSelectedItem(null)} 
                className="absolute top-6 right-6 p-2 hover:bg-white rounded-full text-slate-400 transition-all shadow-sm z-10"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-5 mb-6">
                <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center text-white shadow-xl ${selectedItem.type === 'bug' ? 'bg-red-500 shadow-red-100' : selectedItem.type === 'feature' ? 'bg-indigo-500 shadow-indigo-100' : 'bg-amber-500 shadow-amber-100'}`}>
                  {getTypeIcon(selectedItem.type, "w-8 h-8")}
                </div>
                <div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border inline-block mb-1.5 ${getTypeStyle(selectedItem.type)}`}>
                    {selectedItem.type}
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{selectedItem.title}</h2>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                   {getStatusIcon(selectedItem.status, "w-5 h-5")}
                   <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pipeline Status</p>
                     <p className="text-xs font-bold text-slate-900 capitalize">{selectedItem.status.replace('-', ' ')}</p>
                   </div>
                </div>
                <div className="flex-1 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                   <Calendar className="w-5 h-5 text-indigo-400" />
                   <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Submitted On</p>
                     <p className="text-xs font-bold text-slate-900">{new Date(selectedItem.createdAt).toLocaleDateString()}</p>
                   </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-500" /> Observation Context
                </h3>
                <div className="p-8 bg-slate-950 rounded-[40px] text-indigo-50 relative overflow-hidden group shadow-2xl">
                  <p className="text-lg leading-relaxed italic opacity-90 z-10 relative">
                    "{selectedItem.description}"
                  </p>
                  <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-500" /> Contributor Details
                </h3>
                <div className="p-6 bg-slate-50 border border-slate-100 rounded-[32px] flex items-center gap-5">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-600 text-xl font-black shadow-sm border border-slate-200">
                    {users.find(u => u.id === selectedItem.userId)?.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="font-black text-slate-900">{users.find(u => u.id === selectedItem.userId)?.name || 'Impact Member'}</p>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{users.find(u => u.id === selectedItem.userId)?.role || 'Stakeholder'} • Enterprise Contributor</p>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="space-y-4 animate-in slide-in-from-bottom-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-500" /> Strategic Alignment
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {(['planned', 'in-progress', 'done', 'postponed', 'canceled'] as FeedbackItem['status'][]).map(s => (
                      <button 
                        key={s} 
                        onClick={() => handleStatusUpdate(selectedItem.id, s)}
                        className={`flex items-center gap-2 p-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${selectedItem.status === s ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-400'}`}
                      >
                        {getStatusIcon(s, "w-3 h-3")}
                        {s.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-slate-100 bg-white flex gap-4">
              <button 
                onClick={() => setDeleteConfirmItem(selectedItem)} 
                className="px-6 py-4 border border-red-200 bg-white text-red-600 hover:bg-red-50 rounded-[24px] transition-all group shrink-0 active:scale-95"
              >
                <Trash2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
              </button>
              <button 
                onClick={() => setSelectedItem(null)} 
                className="flex-1 py-4 bg-slate-900 text-white font-black uppercase text-xs tracking-[0.2em] rounded-[24px] hover:bg-indigo-700 active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-3"
              >
                <CheckCircle2 className="w-5 h-5" /> Dismiss Audit View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmAction.type && confirmAction.item && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  confirmAction.type === 'done' 
                    ? 'bg-emerald-50 text-emerald-600' 
                    : confirmAction.type === 'in-execution'
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {confirmAction.type === 'done' ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : confirmAction.type === 'in-execution' ? (
                    <Clock className="w-6 h-6" />
                  ) : (
                    <Archive className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    {confirmAction.type === 'done' 
                      ? 'Mark as Done?' 
                      : confirmAction.type === 'in-execution'
                      ? 'Mark as In Execution?'
                      : 'Archive Entry?'}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    {confirmAction.type === 'done' 
                      ? 'This will move the entry to Archive & Done'
                      : confirmAction.type === 'in-execution'
                      ? 'This will mark the entry as in progress'
                      : 'This will archive the entry'}
                  </p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-sm font-bold text-slate-900 mb-1">{confirmAction.item.title}</p>
                <p className="text-xs text-slate-500 line-clamp-2">{confirmAction.item.description}</p>
              </div>
            </div>
            <div className="p-6 flex gap-3">
              <button
                onClick={() => setConfirmAction({ type: null, item: null })}
                className="flex-1 py-3 border border-slate-200 text-slate-400 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className={`flex-1 py-3 font-black uppercase text-xs tracking-widest rounded-xl transition-all shadow-lg ${
                  confirmAction.type === 'done'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : confirmAction.type === 'in-execution'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-slate-600 text-white hover:bg-slate-700'
                }`}
              >
                {confirmAction.type === 'done' 
                  ? 'Mark Done' 
                  : confirmAction.type === 'in-execution'
                  ? 'Start Execution'
                  : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-50 text-red-600">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Delete Entry?</h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    This action cannot be undone. The entry will be permanently removed from the registry.
                  </p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-sm font-bold text-slate-900 mb-1">{deleteConfirmItem.title}</p>
                <p className="text-xs text-slate-500 line-clamp-2">{deleteConfirmItem.description}</p>
              </div>
            </div>
            <div className="p-6 flex gap-3">
              <button
                onClick={() => setDeleteConfirmItem(null)}
                className="flex-1 py-3 border border-slate-200 text-slate-400 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmItem.id)}
                className="flex-1 py-3 bg-red-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-lg"
              >
                Delete Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Roadmap;
