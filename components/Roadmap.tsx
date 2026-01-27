
import React, { useState, useEffect } from 'react';
import { 
  Map, Sparkles, Bug, Lightbulb, CheckCircle2, Clock, 
  PauseCircle, XCircle, MoreVertical, Search, Filter, 
  Loader2, AlertTriangle, ChevronRight, Box, History,
  X, User, Calendar, MessageSquare, Tag, Layout, ArrowRight,
  Trash2, Mail, Zap
} from 'lucide-react';
import { FeedbackItem, User as UserType } from '../types';
import { apiGetFeedback, apiUpdateFeedback, apiDeleteFeedback, apiGetUsers } from '../utils/api';
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
    if (!isAdmin || !confirm('Permanently remove this entry from the Roadmap?')) return;
    try {
      await apiDeleteFeedback(id);
      setItems(prev => prev.filter(item => item.id !== id));
      if (selectedItem?.id === id) setSelectedItem(null);
      showSuccess('Entry purged from registry.');
    } catch (err) {
      showError('Purge failed.');
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
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32"><Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" /><p className="text-xs font-black text-slate-400 uppercase tracking-widest">Synchronizing Registry...</p></div>
          ) : filteredItems.length === 0 ? (
            <div className="py-32 bg-white rounded-[40px] border border-dashed border-slate-200 text-center flex flex-col items-center justify-center gap-4">
               <Box className="w-16 h-16 text-slate-100" />
               <div>
                 <p className="text-lg font-black text-slate-900">No Registry Entries Found</p>
                 <p className="text-xs text-slate-400 font-medium">Use the Feedback hub to add strategic entries.</p>
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
                       <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full text-[9px] font-black text-slate-500 uppercase">
                         {getStatusIcon(item.status, "w-2.5 h-2.5")}
                         {item.status}
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
              {isAdmin && (
                <button 
                  onClick={() => handleDelete(selectedItem.id)} 
                  className="px-6 py-4 border border-slate-200 bg-white text-red-500 hover:bg-red-50 rounded-[24px] transition-all group shrink-0 active:scale-95"
                >
                  <Trash2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </button>
              )}
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
    </div>
  );
};

export default Roadmap;
