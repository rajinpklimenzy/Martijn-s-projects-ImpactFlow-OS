
import React, { useState, useEffect } from 'react';
import { 
  FolderKanban, CheckCircle2, Clock, AlertCircle, MoreVertical, Plus, 
  ChevronRight, Loader2, Edit2, Trash2, X, AlertTriangle, CheckSquare, 
  ListChecks, Archive, RotateCcw, Box
} from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      const [projRes, compRes, userRes, taskRes] = await Promise.all([
        apiGetProjects(userId),
        apiGetCompanies(),
        apiGetUsers(),
        apiGetTasks(userId)
      ]);
      setProjects(projRes.data || []);
      setCompanies(compRes.data || []);
      setUsers(userRes.data || []);
      setTasks(taskRes.data || []);
    } catch (err: any) { showError('Failed to load projects'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, [currentUser]);

  useEffect(() => {
    const handleRefresh = () => fetchData();
    window.addEventListener('refresh-projects', handleRefresh);
    return () => window.removeEventListener('refresh-projects', handleRefresh);
  }, []);

  const calculateProjectProgress = (projectId: string): number => {
    const projectTasks = tasks.filter(task => task.projectId === projectId);
    if (projectTasks.length === 0) return 0;
    const completedTasks = projectTasks.filter(task => task.status === 'Done').length;
    return Math.round((completedTasks / projectTasks.length) * 100);
  };

  const handleArchiveProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiUpdateProject(id, { archived: viewMode === 'active' });
      setProjects(prev => prev.map(p => p.id === id ? { ...p, archived: viewMode === 'active' } : p));
      showSuccess(viewMode === 'active' ? 'Project archived' : 'Project restored');
    } catch (err) { showError('Failed to update project status'); }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Permanently delete this project and all its tasks?')) return;
    try {
      await apiDeleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      showSuccess('Project deleted entirely');
    } catch (err) { showError('Deletion failed'); }
  };

  const filteredProjects = projects.filter(p => viewMode === 'archived' ? p.archived : !p.archived);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Project Workspace</h1>
          <div className="flex gap-4 mt-2">
            <button onClick={() => setViewMode('active')} className={`text-sm font-bold pb-1 transition-all ${viewMode === 'active' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>Active</button>
            <button onClick={() => setViewMode('archived')} className={`text-sm font-bold pb-1 transition-all ${viewMode === 'archived' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>Archived ({projects.filter(p => p.archived).length})</button>
          </div>
        </div>
        <button onClick={onCreateProject} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-100">
          <Plus className="w-4 h-4" /> Create Project
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white border border-dashed border-slate-300 rounded-[40px] text-center">
          <Box className="w-16 h-16 text-slate-200 mb-6" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No {viewMode} projects found</h3>
          <p className="text-slate-500 text-sm max-w-xs">Start a new logistics transformation project to see milestones and tracking.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map(project => {
            const company = companies.find(c => c.id === project.companyId);
            const progress = calculateProjectProgress(project.id);
            return (
              <div 
                key={project.id} 
                onClick={() => { if(!project.archived) { sessionStorage.setItem('selectedProjectId', project.id); onNavigate('tasks'); } }}
                className={`bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm transition-all relative ${project.archived ? 'opacity-70 grayscale-[0.5]' : 'hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98] group'}`}
              >
                <div className="absolute top-5 right-5 flex gap-2">
                   <button onClick={(e) => handleArchiveProject(project.id, e)} className="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all" title={viewMode === 'active' ? 'Archive' : 'Restore'}>
                     {viewMode === 'active' ? <Archive className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                   </button>
                   <button onClick={(e) => handleDeleteProject(project.id, e)} className="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-all">
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
                <div className="p-7">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform"><FolderKanban className="w-6 h-6" /></div>
                  <h3 className="font-bold text-lg text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors truncate">{project.title}</h3>
                  <p className="text-sm font-medium text-slate-400 mb-8 truncate">{company?.name || 'Standalone Project'}</p>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest"><span className="text-slate-400">Implementation Progress</span><span className="text-indigo-600">{progress}%</span></div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden"><div className="bg-indigo-600 h-full transition-all duration-700" style={{width: `${progress}%`}} /></div>
                  </div>
                </div>
                <div className="bg-slate-50/50 px-7 py-4 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> {project.status}</span>
                  {!project.archived && <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Projects;
