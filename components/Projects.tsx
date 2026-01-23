
import React, { useState, useEffect } from 'react';
import { FolderKanban, CheckCircle2, Clock, AlertCircle, MoreVertical, Plus, ChevronRight, Loader2 } from 'lucide-react';
import { Project, Company, User as UserType, Task } from '../types';
import { apiGetProjects, apiGetCompanies, apiGetUsers, apiGetTasks } from '../utils/api';
import { useToast } from '../contexts/ToastContext';

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

  // Fetch projects, companies, and users
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
        
        // Fetch projects
        const projectsResponse = await apiGetProjects(userId);
        const fetchedProjects = projectsResponse?.data || projectsResponse || [];
        setProjects(Array.isArray(fetchedProjects) ? fetchedProjects : []);

        // Fetch companies
        try {
          const companiesResponse = await apiGetCompanies();
          setCompanies(companiesResponse?.data || companiesResponse || []);
        } catch (err) {
          console.error('Failed to fetch companies:', err);
          setCompanies([]);
        }

        // Fetch users
        try {
          const usersResponse = await apiGetUsers();
          setUsers(usersResponse?.data || usersResponse || []);
        } catch (err) {
          console.error('Failed to fetch users:', err);
          setUsers([]);
        }

        // Fetch tasks to calculate project progress
        try {
          const tasksResponse = await apiGetTasks(userId);
          const fetchedTasks = tasksResponse?.data || tasksResponse || [];
          setTasks(Array.isArray(fetchedTasks) ? fetchedTasks : []);
        } catch (err) {
          console.error('Failed to fetch tasks:', err);
          setTasks([]);
        }
      } catch (err: any) {
        console.error('[PROJECTS] Failed to fetch projects data:', err);
        showError(err.message || 'Failed to load projects');
        setProjects([]);
        setCompanies([]);
        setUsers([]);
        setTasks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  // Listen for project creation/update events and task updates
  useEffect(() => {
    const handleRefresh = async () => {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      try {
        const projectsResponse = await apiGetProjects(userId);
        const fetchedProjects = projectsResponse?.data || projectsResponse || [];
        setProjects(Array.isArray(fetchedProjects) ? fetchedProjects : []);
      } catch (err) {
        console.error('Failed to refresh projects:', err);
      }
    };

    const handleTaskRefresh = async () => {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      try {
        const tasksResponse = await apiGetTasks(userId);
        const fetchedTasks = tasksResponse?.data || tasksResponse || [];
        setTasks(Array.isArray(fetchedTasks) ? fetchedTasks : []);
      } catch (err) {
        console.error('Failed to refresh tasks:', err);
      }
    };

    window.addEventListener('refresh-projects', handleRefresh);
    window.addEventListener('refresh-tasks', handleTaskRefresh);
    return () => {
      window.removeEventListener('refresh-projects', handleRefresh);
      window.removeEventListener('refresh-tasks', handleTaskRefresh);
    };
  }, [currentUser]);

  // Calculate project progress based on completed tasks
  const calculateProjectProgress = (projectId: string): number => {
    const projectTasks = tasks.filter(task => task.projectId === projectId);
    if (projectTasks.length === 0) return 0;
    
    const completedTasks = projectTasks.filter(task => task.status === 'Done').length;
    const progress = Math.round((completedTasks / projectTasks.length) * 100);
    return progress;
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'Active': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'Completed': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      default: return <AlertCircle className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Project Workspace</h1>
          <p className="text-slate-500 text-sm">Active digital transformation initiatives</p>
        </div>
        <button 
          onClick={onCreateProject}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md"
        >
          <Plus className="w-4 h-4" />
          Create Project
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-slate-300 rounded-2xl text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
            <FolderKanban className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">No Projects Found</h3>
          <p className="text-slate-500 text-sm mb-6">Get started by creating your first project.</p>
          <button 
            onClick={onCreateProject}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Your First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => {
            const company = companies.find(c => c.id === project.companyId);
            const assignedUsers = project.assignedUserIds?.map(userId => 
              users.find(u => u.id === userId)
            ).filter(Boolean) || [];

            return (
              <div 
                key={project.id} 
                onClick={() => {
                  // Store selected project ID in sessionStorage to filter tasks
                  sessionStorage.setItem('selectedProjectId', project.id);
                  onNavigate('tasks');
                }}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                      <FolderKanban className="w-6 h-6 text-indigo-600" />
                    </div>
                    <button className="p-1 hover:bg-slate-50 rounded">
                      <MoreVertical className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">{project.title}</h3>
                  <p className="text-sm text-slate-500 mb-6">{company?.name || 'No company'}</p>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold uppercase tracking-wider text-slate-400">Project Progress</span>
                      <span className="font-bold text-slate-900">{calculateProjectProgress(project.id)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-indigo-600 h-full transition-all duration-500" style={{width: `${calculateProjectProgress(project.id)}%`}} />
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-100 flex justify-between items-center group-hover:bg-indigo-50/30 transition-colors">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(project.status)}
                    <span className="text-xs font-bold text-slate-600">{project.status}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {assignedUsers.length > 0 ? (
                      <div className="flex -space-x-2">
                        {assignedUsers.slice(0, 3).map((user, idx) => (
                          <img 
                            key={user?.id || idx}
                            src={user?.avatar || `https://picsum.photos/seed/${user?.id || idx}/40/40`} 
                            className="w-6 h-6 rounded-full border-2 border-white" 
                            alt={user?.name}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white" />
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                  </div>
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
