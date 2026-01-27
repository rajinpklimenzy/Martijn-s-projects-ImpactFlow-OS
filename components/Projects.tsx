
import React, { useState, useEffect } from 'react';
import { FolderKanban, CheckCircle2, Clock, AlertCircle, MoreVertical, Plus, ChevronRight, Loader2, Edit2, Trash2, X, AlertTriangle, CheckSquare, ListChecks } from 'lucide-react';
import { Project, Company, User as UserType, Task } from '../types';
import { apiGetProjects, apiGetCompanies, apiGetUsers, apiGetTasks, apiUpdateProject, apiDeleteProject } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { ImageWithFallback } from './common';

interface ProjectsProps {
  onNavigate: (tab: string) => void;
  onCreateProject: () => void;
  currentUser?: any;
}

const Projects: React.FC<ProjectsProps> = ({ onNavigate, onCreateProject, currentUser }) => {
  const { showSuccess, showError } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editFormData, setEditFormData] = useState({ title: '', status: 'Planning', description: '', companyId: '', ownerId: '', assignedUserIds: [] as string[] });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Multi-select state
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
        const projectsResponse = await apiGetProjects(userId);
        setProjects(Array.isArray(projectsResponse?.data || projectsResponse) ? (projectsResponse?.data || projectsResponse) : []);
        try { const companiesResponse = await apiGetCompanies(); setCompanies(companiesResponse?.data || []); } catch (err) {}
        try { const usersResponse = await apiGetUsers(); setUsers(usersResponse?.data || []); } catch (err) {}
        try { const tasksResponse = await apiGetTasks(userId); setTasks(Array.isArray(tasksResponse?.data || tasksResponse) ? (tasksResponse?.data || tasksResponse) : []); } catch (err) {}
      } catch (err: any) { showError(err.message || 'Failed to load projects'); }
      finally { setIsLoading(false); }
    };
    fetchData();
  }, [currentUser]);

  const calculateProjectProgress = (projectId: string): number => {
    const projectTasks = tasks.filter(task => task.projectId === projectId);
    if (projectTasks.length === 0) return 0;
    const completedTasks = projectTasks.filter(task => task.status === 'Done').length;
    return Math.round((completedTasks / projectTasks.length) * 100);
  };

  const toggleAll = () => {
    if (selectedProjectIds.length === projects.length) setSelectedProjectIds([]);
    else setSelectedProjectIds(projects.map(p => p.id));
  };

  const handleBulkDelete = async () => {
    setIsBulkProcessing(true);
    try {
      await Promise.all(selectedProjectIds.map(id => apiDeleteProject(id)));
      setProjects(prev => prev.filter(p => !selectedProjectIds.includes(p.id)));
      showSuccess(`Successfully removed ${selectedProjectIds.length} projects`);
      setSelectedProjectIds([]);
      setShowBulkDeleteConfirm(false);
    } catch (err) { showError('Some projects failed to delete'); }
    finally { setIsBulkProcessing(false); }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'Active': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'Completed': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      default: return <AlertCircle className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Project Workspace</h1>
          <p className="text-slate-500 text-sm font-medium">Manage initiatives and milestone progress</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={toggleAll}
            className="flex-1 sm:flex-none px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
          >
            <ListChecks className="w-4 h-4" />
            {selectedProjectIds.length === projects.length && projects.length > 0 ? 'Deselect All' : 'Select All'}
          </button>
          <button onClick={onCreateProject} className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
            <Plus className="w-4 h-4" /> 
            Create Project
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
          <p className="text-slate-500 text-sm font-black uppercase tracking-widest">Compiling Workspace Data...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-slate-300 rounded-[40px] text-center">
          <FolderKanban className="w-16 h-16 text-slate-200 mb-6" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">Workspace Empty</h3>
          <p className="text-slate-500 text-sm max-w-xs mb-8">Start your first logistics transformation project to see milestones and tracking.</p>
          <button onClick={onCreateProject} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2"><Plus className="w-5 h-5" /> Launch Project</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => {
            const company = companies.find(c => c.id === project.companyId);
            const isSelected = selectedProjectIds.includes(project.id);
            const progress = calculateProjectProgress(project.id);
            return (
              <div 
                key={project.id} 
                onClick={() => { sessionStorage.setItem('selectedProjectId', project.id); onNavigate('tasks'); }}
                className={`bg-white rounded-3xl border overflow-hidden shadow-sm transition-all cursor-pointer group active:scale-[0.98] relative ${isSelected ? 'border-indigo-600 ring-2 ring-indigo-50 bg-indigo-50/10' : 'border-slate-200 hover:border-indigo-300 hover:shadow-md'}`}
              >
                <div className="absolute top-5 right-5 z-10" onClick={(e) => {
                  e.stopPropagation();
                  setSelectedProjectIds(prev => isSelected ? prev.filter(id => id !== project.id) : [...prev, project.id]);
                }}>
                   <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-200' : 'bg-white border-slate-200 group-hover:border-indigo-300'}`}>
                      {isSelected && <CheckSquare className="w-4 h-4 text-white" />}
                    </div>
                </div>
                <div className="p-7">
                  <div className="flex justify-between items-start mb-6 pr-8">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform"><FolderKanban className="w-6 h-6" /></div>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProject(project);
                      setEditFormData({ title: project.title, status: project.status, description: project.description || '', companyId: project.companyId, ownerId: project.ownerId || '', assignedUserIds: project.assignedUserIds || [] });
                      setIsEditModalOpen(true);
                    }} className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 className="w-4.5 h-4.5" /></button>
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors truncate">{project.title}</h3>
                  <p className="text-sm font-medium text-slate-400 mb-8 truncate">{company?.name || 'External Project'}</p>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest"><span className="text-slate-400">Implementation Progress</span><span className="text-indigo-600">{progress}%</span></div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden"><div className="bg-indigo-600 h-full transition-all duration-700 ease-out" style={{width: `${progress}%`}} /></div>
                  </div>
                </div>
                <div className="bg-slate-50/50 px-7 py-4 border-t border-slate-100 flex justify-between items-center group-hover:bg-indigo-50/30 transition-colors">
                  <div className="flex items-center gap-2.5">{getStatusIcon(project.status)}<span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">{project.status}</span></div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedProjectIds.length > 0 && (
        <div className="fixed bottom-6 left-4 right-4 lg:left-1/2 lg:-translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 duration-300">
          <div className="bg-slate-900 text-white rounded-[24px] shadow-2xl px-4 lg:px-6 py-3 flex flex-col sm:flex-row items-center gap-3 sm:gap-6 border border-white/10 max-w-2xl mx-auto">
            <div className="flex items-center justify-between w-full sm:w-auto">
              <span className="text-sm font-bold flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-indigo-400" />
                {selectedProjectIds.length} projects selected
              </span>
              <button onClick={() => setSelectedProjectIds([])} className="sm:hidden p-2 text-slate-400"><X className="w-5 h-5" /></button>
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
              <button onClick={() => setSelectedProjectIds([])} className="hidden sm:block p-2 hover:bg-white/10 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
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
            <h3 className="text-2xl font-black text-slate-900 mb-2">Delete Projects?</h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              You are about to permanently remove <span className="font-bold text-slate-900">{selectedProjectIds.length} projects</span> and all their nested tasks. This infrastructure teardown cannot be reversed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowBulkDeleteConfirm(false)} className="flex-1 py-4 bg-slate-50 text-slate-600 font-bold rounded-2xl hover:bg-slate-100 transition-colors">Cancel</button>
              <button 
                onClick={handleBulkDelete}
                disabled={isBulkProcessing}
                className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all flex items-center justify-center gap-2"
              >
                {isBulkProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
