
import React, { useState, useEffect } from 'react';
import { FolderKanban, CheckCircle2, Clock, AlertCircle, MoreVertical, Plus, ChevronRight, Loader2, Edit2, Trash2, X, AlertTriangle } from 'lucide-react';
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editFormData, setEditFormData] = useState<{ title: string; status: string; description: string; companyId: string; ownerId: string; assignedUserIds: string[] }>({
    title: '',
    status: 'Planning',
    description: '',
    companyId: '',
    ownerId: '',
    assignedUserIds: []
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.project-menu-container')) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenuId]);

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

  const handleEditClick = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProject(project);
    setEditFormData({
      title: project.title || '',
      status: project.status || 'Planning',
      description: project.description || '',
      companyId: project.companyId || '',
      ownerId: project.ownerId || '',
      assignedUserIds: project.assignedUserIds || []
    });
    setIsEditModalOpen(true);
    setOpenMenuId(null);
  };

  const handleDeleteClick = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProject(project);
    setIsDeleteConfirmOpen(true);
    setOpenMenuId(null);
  };

  const handleUpdateProject = async () => {
    if (!selectedProject) return;

    setIsUpdating(true);
    try {
      await apiUpdateProject(selectedProject.id, editFormData);
      showSuccess('Project updated successfully!');
      setIsEditModalOpen(false);
      setSelectedProject(null);
      
      // Refresh projects
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      const projectsResponse = await apiGetProjects(userId);
      const fetchedProjects = projectsResponse?.data || projectsResponse || [];
      setProjects(Array.isArray(fetchedProjects) ? fetchedProjects : []);
      
      window.dispatchEvent(new Event('refresh-projects'));
    } catch (err: any) {
      console.error('Failed to update project:', err);
      showError(err.message || 'Failed to update project');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    setIsDeleting(true);
    try {
      await apiDeleteProject(selectedProject.id);
      showSuccess('Project and associated tasks deleted successfully!');
      setIsDeleteConfirmOpen(false);
      setSelectedProject(null);
      
      // Refresh projects and tasks
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      const projectsResponse = await apiGetProjects(userId);
      const fetchedProjects = projectsResponse?.data || projectsResponse || [];
      setProjects(Array.isArray(fetchedProjects) ? fetchedProjects : []);
      
      const tasksResponse = await apiGetTasks(userId);
      const fetchedTasks = tasksResponse?.data || tasksResponse || [];
      setTasks(Array.isArray(fetchedTasks) ? fetchedTasks : []);
      
      window.dispatchEvent(new Event('refresh-projects'));
      window.dispatchEvent(new Event('refresh-tasks'));
    } catch (err: any) {
      console.error('Failed to delete project:', err);
      showError(err.message || 'Failed to delete project');
    } finally {
      setIsDeleting(false);
    }
  };

  // Get project task count for delete confirmation
  const getProjectTaskCount = (projectId: string) => {
    return tasks.filter(task => task.projectId === projectId).length;
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
                    <div className="relative project-menu-container">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === project.id ? null : project.id);
                        }}
                        className="p-1 hover:bg-slate-50 rounded"
                      >
                        <MoreVertical className="w-4 h-4 text-slate-400" />
                      </button>
                      {openMenuId === project.id && (
                        <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[160px]">
                          <button
                            onClick={(e) => handleEditClick(project, e)}
                            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit Project
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(project, e)}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete Project
                          </button>
                        </div>
                      )}
                    </div>
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
                          <ImageWithFallback
                            key={user?.id || idx}
                            src={user?.avatar}
                            alt={user?.name || ''}
                            fallbackText={user?.name || user?.email || 'U'}
                            className="w-6 h-6 border-2 border-white"
                            isAvatar={true}
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

      {/* Edit Project Modal */}
      {isEditModalOpen && selectedProject && (
        <div className="fixed inset-0 z-[80] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300" onClick={() => setIsEditModalOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl pointer-events-auto animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 bg-white">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Edit Project</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">Update Project Details</p>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors shadow-sm">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleUpdateProject(); }} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Project Title</label>
                  <input 
                    required
                    type="text" 
                    value={editFormData.title}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Company</label>
                  <select
                    required
                    value={editFormData.companyId}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, companyId: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">Select Company</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>{company.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</label>
                  <select
                    required
                    value={editFormData.status}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="Planning">Planning</option>
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Owner</label>
                  <select
                    required
                    value={editFormData.ownerId}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, ownerId: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">Select Owner</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.name || user.email}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assigned Users</label>
                  <select
                    multiple
                    value={editFormData.assignedUserIds}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value);
                      setEditFormData(prev => ({ ...prev, assignedUserIds: selected }));
                    }}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 min-h-[100px]"
                  >
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.name || user.email}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400">Hold Ctrl/Cmd to select multiple users</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</label>
                  <textarea 
                    value={editFormData.description}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 resize-none" 
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
                      'Update Project'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && selectedProject && (
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
                    <h3 className="text-lg font-bold text-slate-900">Delete Project</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">This action cannot be undone</p>
                  </div>
                </div>
                <button onClick={() => setIsDeleteConfirmOpen(false)} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors shadow-sm">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600">
                  Are you sure you want to delete <span className="font-bold text-slate-900">{selectedProject.title}</span>?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-xs text-red-700 font-semibold mb-1">⚠️ Warning:</p>
                  <p className="text-xs text-red-600">
                    This will permanently delete the project and all {getProjectTaskCount(selectedProject.id)} associated task(s). This action cannot be undone.
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
                    onClick={handleDeleteProject}
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
                        Delete Project
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

export default Projects;
