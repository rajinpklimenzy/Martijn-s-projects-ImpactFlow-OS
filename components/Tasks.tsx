
import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, Circle, Clock, MoreVertical, Plus, Filter, Search, 
  Calendar, ChevronRight, X, User, Layout, Trash2, Tag, Loader2, 
  CheckSquare, FileUp, List, Grid, Download, AlertCircle, Save,
  Archive, RotateCcw, Box, FileSpreadsheet, Info, ArrowRight, Table,
  FileText
} from 'lucide-react';
import { Task, Project, User as UserType } from '../types';
import { apiGetTasks, apiUpdateTask, apiDeleteTask, apiGetProjects, apiGetUsers, apiCreateTask } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { ImageWithFallback } from './common';

interface TasksProps {
  onCreateTask: () => void;
  currentUser?: any;
}

const Tasks: React.FC<TasksProps> = ({ onCreateTask, currentUser }) => {
  const { showSuccess, showError, showInfo } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
  const [displayMode, setDisplayMode] = useState<'list' | 'card'>('list');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importStep, setImportStep] = useState<'upload' | 'mapping'>('upload');
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      const [taskRes, projRes, userRes] = await Promise.all([
        apiGetTasks(userId),
        apiGetProjects(),
        apiGetUsers()
      ]);
      setTasks(taskRes.data || []);
      setProjects(projRes.data || []);
      setUsers(userRes.data || []);
    } catch (err) { showError('Failed to load tasks'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, [currentUser]);

  const handleArchiveTask = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiUpdateTask(id, { archived: viewMode === 'active' });
      // FIXED: Corrected reference 'p' to 't'
      setTasks(prev => prev.map(t => t.id === id ? { ...t, archived: viewMode === 'active' } : t));
      showSuccess(viewMode === 'active' ? 'Task archived' : 'Task restored');
    } catch (err) { showError('Update failed'); }
  };

  const handleDownloadTemplate = () => {
    const csvContent = "Title,Due Date (YYYY-MM-DD),Priority (Low/Medium/High),Description\nUpdate Logistics Map,2024-12-31,High,Audit the EMEA transit routes";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ImpactFlow_Task_Import_Template.csv';
    a.click();
    showInfo('Registry template downloaded');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulate reading headers for mapping
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const headers = text.split('\n')[0].split(',').map(h => h.trim());
      setDetectedColumns(headers);
      setImportStep('mapping');
    };
    reader.readAsText(file);
  };

  const toggleStatus = async (id: string, current: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = current === 'Done' ? 'Todo' : 'Done';
    try {
      await apiUpdateTask(id, { status: newStatus as any });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus as any } : t));
    } catch (err) { showError('Status update failed'); }
  };

  const filteredTasks = tasks.filter(t => {
    const archiveMatch = viewMode === 'archived' ? t.archived : !t.archived;
    if (!archiveMatch) return false;
    if (!searchQuery.trim()) return true;
    return t.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <div className="flex gap-4 mt-2">
            <button onClick={() => setViewMode('active')} className={`text-sm font-bold pb-1 transition-all ${viewMode === 'active' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>Active</button>
            <button onClick={() => setViewMode('archived')} className={`text-sm font-bold pb-1 transition-all ${viewMode === 'archived' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>Archive ({tasks.filter(t => t.archived).length})</button>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setIsImportOpen(true); setImportStep('upload'); }} className="px-3 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-all"><FileUp className="w-4 h-4" /> Bulk Import</button>
          <button onClick={onCreateTask} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg"><Plus className="w-4 h-4" /> New Task</button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search tasks..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100" />
        </div>
        <div className="flex bg-white p-1 border border-slate-200 rounded-xl shadow-sm">
          <button onClick={() => setDisplayMode('list')} className={`p-2 rounded-lg ${displayMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}><List className="w-4 h-4" /></button>
          <button onClick={() => setDisplayMode('card')} className={`p-2 rounded-lg ${displayMode === 'card' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}><Grid className="w-4 h-4" /></button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-20 bg-white rounded-3xl border border-dashed border-slate-200 text-center">
          <Box className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No {viewMode} tasks found</p>
        </div>
      ) : displayMode === 'list' ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
           <div className="divide-y divide-slate-50">
             {filteredTasks.map(task => (
               <div key={task.id} className={`flex items-center gap-4 p-5 hover:bg-slate-50 transition-colors ${task.archived ? 'bg-slate-50/50' : ''}`}>
                 <button onClick={(e) => toggleStatus(task.id, task.status, e)} className="text-slate-300 hover:text-indigo-600">
                   {task.status === 'Done' ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <Circle className="w-6 h-6" />}
                 </button>
                 <div className="flex-1 overflow-hidden">
                   <p className={`font-bold text-sm ${task.status === 'Done' ? 'line-through text-slate-400' : 'text-slate-900'}`}>{task.title}</p>
                   <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{projects.find(p => p.id === task.projectId)?.title || 'General'}</p>
                 </div>
                 <div className="flex items-center gap-3">
                   <button onClick={(e) => handleArchiveTask(task.id, e)} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-lg transition-all">
                     {task.archived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                   </button>
                   <button onClick={(e) => { e.stopPropagation(); apiDeleteTask(task.id).then(fetchData); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-white rounded-lg transition-all">
                     <Trash2 className="w-4 h-4" />
                   </button>
                 </div>
               </div>
             ))}
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map(task => (
             <div key={task.id} className="bg-white p-6 rounded-3xl border border-slate-200 relative group">
                <div className="flex justify-between items-start mb-4">
                   <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600"><CheckSquare className="w-4 h-4" /></div>
                   <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={(e) => handleArchiveTask(task.id, e)} className="p-1.5 text-slate-400 hover:text-indigo-600"><Archive className="w-3.5 h-3.5" /></button>
                     <button onClick={(e) => { e.stopPropagation(); apiDeleteTask(task.id).then(fetchData); }} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                   </div>
                </div>
                <h4 className={`font-bold text-slate-900 mb-2 ${task.status === 'Done' ? 'line-through opacity-40' : ''}`}>{task.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-2 mb-6">{task.description}</p>
                <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                  <span className="text-[10px] font-black text-slate-400 uppercase">{task.dueDate}</span>
                  <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${task.priority === 'High' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'}`}>{task.priority}</div>
                </div>
             </div>
          ))}
        </div>
      )}
      
      {/* Enhanced Import Modal */}
      {isImportOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
             <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/50 shrink-0">
               <div className="flex items-center gap-4">
                 <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                   <FileUp className="w-7 h-7" />
                 </div>
                 <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Enterprise Registry Import</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black mt-2">Logistical Data Migration</p>
                 </div>
               </div>
               <button onClick={() => setIsImportOpen(false)} className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-slate-200">
                 <X className="w-6 h-6 text-slate-400" />
               </button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                {importStep === 'upload' ? (
                  <div className="space-y-10 animate-in fade-in duration-300">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-8">
                       <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 mb-6">
                         <Info className="w-4 h-4" /> Registry Data Requirements
                       </h4>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                         <div className="space-y-1">
                           <p className="text-xs font-black text-slate-700 uppercase tracking-tighter flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Column: Title *
                           </p>
                           <p className="text-[10px] text-slate-500 font-medium ml-3.5">Official objective identifier.</p>
                         </div>
                         <div className="space-y-1">
                           <p className="text-xs font-black text-slate-700 uppercase tracking-tighter flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Column: Due Date *
                           </p>
                           <p className="text-[10px] text-slate-500 font-medium ml-3.5">Format as YYYY-MM-DD.</p>
                         </div>
                         <div className="space-y-1">
                           <p className="text-xs font-black text-slate-700 uppercase tracking-tighter flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-slate-300" /> Column: Priority
                           </p>
                           <p className="text-[10px] text-slate-500 font-medium ml-3.5">Low, Medium, or High.</p>
                         </div>
                         <div className="space-y-1">
                           <p className="text-xs font-black text-slate-700 uppercase tracking-tighter flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-slate-300" /> Column: Description
                           </p>
                           <p className="text-[10px] text-slate-500 font-medium ml-3.5">Strategic context/notes.</p>
                         </div>
                       </div>
                    </div>

                    <div className="flex flex-col gap-5">
                      <button onClick={() => fileInputRef.current?.click()} className="w-full py-16 border-4 border-dashed border-slate-100 rounded-[40px] flex flex-col items-center justify-center gap-4 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group shadow-sm bg-white">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:text-indigo-600 group-hover:scale-110 transition-all border border-slate-100 shadow-inner">
                          <FileSpreadsheet className="w-8 h-8" />
                        </div>
                        <div className="text-center">
                          <span className="text-lg font-black text-slate-900 block mb-1">Select Local Registry</span>
                          <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Supports CSV, XLS, XLSX</span>
                        </div>
                      </button>
                      
                      <button onClick={handleDownloadTemplate} className="w-full py-5 bg-white border-2 border-slate-100 text-slate-600 rounded-[24px] text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-sm">
                        <Download className="w-5 h-5 text-indigo-500" /> Download Registry Schema (Excel Template)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center justify-between">
                       <h4 className="text-lg font-black text-slate-900">Smart Mapping Interface</h4>
                       <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-tighter flex items-center gap-1.5">
                         <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Data Detected
                       </span>
                    </div>
                    
                    <p className="text-sm text-slate-500 leading-relaxed">
                      We've detected {detectedColumns.length} columns in your file. Ensure the ImpactFlow system properties are correctly mapped below.
                    </p>

                    <div className="space-y-4 bg-slate-50 p-8 rounded-[32px] border border-slate-100">
                      {[
                        { label: 'Task Name (Title)', key: 'title', required: true, icon: <FileText className="w-4 h-4" /> },
                        { label: 'Due Date', key: 'dueDate', required: true, icon: <Calendar className="w-4 h-4" /> },
                        { label: 'Task Description', key: 'description', required: false, icon: <Info className="w-4 h-4" /> },
                        { label: 'Priority Level', key: 'priority', required: false, icon: <Tag className="w-4 h-4" /> }
                      ].map(prop => {
                        const matched = detectedColumns.find(c => c.toLowerCase().includes(prop.key.toLowerCase()));
                        return (
                          <div key={prop.key} className="flex flex-col sm:flex-row sm:items-center gap-4 group">
                             <div className="flex-1 flex items-center gap-3">
                               <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-200 transition-all">
                                 {prop.icon}
                               </div>
                               <div>
                                 <p className="text-xs font-black text-slate-700 uppercase tracking-tighter">{prop.label} {prop.required && <span className="text-red-500">*</span>}</p>
                               </div>
                             </div>
                             <ArrowRight className="w-4 h-4 text-slate-300 hidden sm:block" />
                             <select className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100">
                               <option value="">-- Select Source Column --</option>
                               {detectedColumns.map(col => (
                                 <option key={col} value={col} selected={col === matched}>{col}</option>
                               ))}
                             </select>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex gap-4 pt-6">
                      <button onClick={() => setImportStep('upload')} className="flex-1 py-5 border border-slate-200 text-slate-400 font-black uppercase text-xs tracking-widest rounded-[24px] hover:bg-slate-50 transition-all">Back to Upload</button>
                      <button onClick={() => { showSuccess('Data migration initiated. Check background process.'); setIsImportOpen(false); }} className="flex-[2] py-5 bg-indigo-600 text-white font-black uppercase text-xs tracking-[0.2em] rounded-[24px] hover:bg-indigo-700 transition-all shadow-2xl flex items-center justify-center gap-3">
                        <Save className="w-5 h-5" /> Execute Registry Deploy
                      </button>
                    </div>
                  </div>
                )}
             </div>
             
             <input ref={fileInputRef} type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={handleFileSelect} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
