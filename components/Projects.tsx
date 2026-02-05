
import React, { useState, useEffect, useMemo } from 'react';
import { 
  FolderKanban, CheckCircle2, Clock, AlertCircle, MoreVertical, Plus, 
  ChevronRight, Loader2, Edit2, Trash2, X, AlertTriangle, CheckSquare, 
  ListChecks, Archive, RotateCcw, Box, Save, Circle, User, Calendar, Tag,
  FileText, Image as ImageIcon, Eye, Download, Mail, History, ExternalLink
} from 'lucide-react';
import { Project, Company, User as UserType, Task } from '../types';
import { apiUpdateTask } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { ImageWithFallback } from './common';
import { 
  useProjects, 
  useCompanies, 
  useUsers, 
  useTasks, 
  useProjectActivities,
  useUpdateProject, 
  useDeleteProject, 
  useArchiveProject,
  useBulkDeleteProjects
} from '../hooks/useProjectsData';

interface ProjectsProps {
  onNavigate: (tab: string) => void;
  onCreateProject: () => void;
  currentUser?: any;
}

const Projects: React.FC<ProjectsProps> = ({ onNavigate, onCreateProject, currentUser }) => {
  const { showSuccess, showError } = useToast();
  const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
  
  // React Query hooks for data fetching
  const { data: projects = [], isLoading: isLoadingProjects } = useProjects(userId);
  const { data: companies = [] } = useCompanies();
  const { data: users = [] } = useUsers();
  const { data: tasks = [] } = useTasks(userId);
  
  // Project detail view state
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const { data: projectActivities = [], isLoading: isLoadingActivities } = useProjectActivities(selectedProject?.id || null);
  
  // UI state
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
  
  // Loading state (true if any query is loading)
  const isLoading = isLoadingProjects;
  
  // Mutation hooks
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const archiveProjectMutation = useArchiveProject();
  const bulkDeleteMutation = useBulkDeleteProjects();

  const calculateProjectProgress = (projectId: string): number => {
    const projectTasks = tasks.filter(task => task.projectId === projectId);
    if (projectTasks.length === 0) return 0;
    const completedTasks = projectTasks.filter(task => task.status === 'Done').length;
    return Math.round((completedTasks / projectTasks.length) * 100);
  };

  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [archivingProjectId, setArchivingProjectId] = useState<string | null>(null);
  const [archiveConfirmProject, setArchiveConfirmProject] = useState<Project | null>(null);
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<Project | null>(null);
  
  // Multi-select state
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [isBulkDeletingProjects, setIsBulkDeletingProjects] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  
  // Project detail view state (remaining state, selectedProject moved to top)
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewerImageUrl, setViewerImageUrl] = useState('');
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    companyId: '',
    status: 'Planning' as Project['status'],
    engagement: '',
    startDate: '',
    endDate: ''
  });
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const handleArchiveProject = async (id: string) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    setArchivingProjectId(id);
    try {
      await archiveProjectMutation.mutateAsync({ 
        id, 
        isArchived: viewMode === 'active' 
      });
      setArchiveConfirmProject(null);
      if (selectedProject?.id === id) {
        setSelectedProject(null);
      }
    } finally {
      setArchivingProjectId(null);
    }
  };

  const handleDeleteProject = async (id: string) => {
    setDeletingProjectId(id);
    try {
      await deleteProjectMutation.mutateAsync(id);
      setDeleteConfirmProject(null);
      if (selectedProject?.id === id) {
        setSelectedProject(null);
      }
    } finally {
      setDeletingProjectId(null);
    }
  };

  // Multi-select handlers
  const selectAllProjects = () => {
    if (selectedProjectIds.length === filteredProjects.length) {
      setSelectedProjectIds([]);
    } else {
      setSelectedProjectIds(filteredProjects.map(p => p.id));
    }
  };

  const handleBulkDeleteProjects = async () => {
    setIsBulkDeletingProjects(true);
    try {
      const targetIds = [...selectedProjectIds];
      await bulkDeleteMutation.mutateAsync(targetIds);
      setSelectedProjectIds([]);
      setBulkDeleteConfirmOpen(false);
      if (selectedProject && targetIds.includes(selectedProject.id)) {
        setSelectedProject(null);
      }
      showSuccess(`Successfully deleted ${targetIds.length} project${targetIds.length > 1 ? 's' : ''}`);
    } catch (err: any) {
      showError(err.message || 'Failed to delete projects');
    } finally {
      setIsBulkDeletingProjects(false);
    }
  };

  // Helper function to format date for HTML date input (YYYY-MM-DD)
  const formatDateForInput = (dateString: string | undefined): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      // Format as YYYY-MM-DD for HTML date input
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  };

  // Project detail view handlers
  const handleOpenProjectDetail = (project: Project) => {
    setSelectedProject(project);
    setEditFormData({
      title: project.title,
      description: project.description || '',
      companyId: project.companyId || '',
      status: project.status,
      engagement: project.engagement || '',
      startDate: formatDateForInput(project.startDate),
      endDate: formatDateForInput(project.endDate)
    });
    setIsEditingProject(false);
  };

  const handleUpdateProject = async () => {
    if (!selectedProject) return;
    
    if (!editFormData.title.trim()) {
      showError('Project title is required');
      return;
    }

    setIsUpdatingProject(true);
    try {
      const updateData: any = {
        title: editFormData.title.trim(),
        description: editFormData.description.trim(),
        status: editFormData.status,
        companyId: editFormData.companyId && editFormData.companyId.trim() !== '' ? editFormData.companyId : null
      };

      await updateProjectMutation.mutateAsync({ 
        id: selectedProject.id, 
        data: updateData 
      });
      
      // Update local state to reflect changes immediately
      const updatedProject = {
        ...selectedProject,
        ...updateData
      };
      setSelectedProject(updatedProject);
      setIsEditingProject(false);
    } catch (err: any) {
      // Error already handled by mutation
    } finally {
      setIsUpdatingProject(false);
    }
  };

  const handleStatusChange = async (newStatus: Project['status']) => {
    if (!selectedProject) return;
    
    setIsUpdatingProject(true);
    try {
      await updateProjectMutation.mutateAsync({ 
        id: selectedProject.id, 
        data: { status: newStatus } 
      });
      
      // Update local state to reflect changes immediately
      const updatedProject = {
        ...selectedProject,
        status: newStatus
      };
      setSelectedProject(updatedProject);
      setEditFormData(prev => ({ ...prev, status: newStatus }));
    } catch (err: any) {
      // Error already handled by mutation
    } finally {
      setIsUpdatingProject(false);
    }
  };

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    setUpdatingTaskId(taskId);
    try {
      const newStatus = currentStatus === 'Done' ? 'Todo' : 'Done';
      await apiUpdateTask(taskId, { status: newStatus as any });
      
      // Update tasks state
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t));
      
      // Refresh tasks to ensure consistency
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      const taskRes = await apiGetTasks(userId);
      setTasks(taskRes.data || []);
      
      showSuccess(newStatus === 'Done' ? 'Task marked as done' : 'Task marked as todo');
    } catch (err: any) {
      showError(err.message || 'Failed to update task status');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Filter projects: show archived if viewMode is 'archived', otherwise show non-archived
  // Treat undefined/null archived as false (not archived)
  // Memoize filtered projects for performance
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const isArchived = p.archived === true;
      return viewMode === 'archived' ? isArchived : !isArchived;
    });
  }, [projects, viewMode]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Project Workspace</h1>
          <div className="flex gap-4 mt-2">
            <button 
              onClick={() => {
                setViewMode('active');
                setSelectedProjectIds([]);
              }} 
              className={`text-sm font-bold pb-1 transition-all ${viewMode === 'active' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}
            >
              Active
            </button>
            <button 
              onClick={() => {
                setViewMode('archived');
                setSelectedProjectIds([]);
              }} 
              className={`text-sm font-bold pb-1 transition-all ${viewMode === 'archived' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}
            >
              Archived ({projects.filter(p => p.archived).length})
            </button>
          </div>
        </div>
        <button onClick={onCreateProject} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-100">
          <Plus className="w-4 h-4" /> Create Project
        </button>
      </div>

      {/* Select All Header */}
      {!isLoading && filteredProjects.length > 0 && (
        <div className="flex items-center gap-3 pb-2">
          <input 
            type="checkbox" 
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
            checked={filteredProjects.length > 0 && selectedProjectIds.length === filteredProjects.length}
            onChange={selectAllProjects}
          />
          <span className="text-sm font-semibold text-slate-600">
            Select All Projects
          </span>
        </div>
      )}

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
            const isSelected = selectedProjectIds.includes(project.id);
            return (
              <div 
                key={project.id} 
                onClick={(e) => { 
                  if (!project.archived && !isSelected) {
                    e.stopPropagation();
                    handleOpenProjectDetail(project);
                  }
                }}
                className={`bg-white rounded-3xl border ${isSelected ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200'} overflow-hidden shadow-sm transition-all relative ${project.archived ? 'opacity-70 grayscale-[0.5]' : 'hover:border-indigo-300 hover:shadow-md cursor-pointer active:scale-[0.98] group'}`}
              >
                <div className="absolute top-5 right-5 flex items-center gap-2">
                   <button 
                     onClick={(e) => { 
                       e.stopPropagation(); 
                       setArchiveConfirmProject(project); 
                     }} 
                     className="p-2 bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all" 
                     title={viewMode === 'active' ? 'Archive' : 'Restore'}
                   >
                     {viewMode === 'active' ? <Archive className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                   </button>
                   <button 
                     onClick={(e) => { 
                       e.stopPropagation(); 
                       setDeleteConfirmProject(project); 
                     }} 
                     className="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-all"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                   <div 
                     onClick={(e) => e.stopPropagation()}
                     className={`p-1.5 rounded-xl transition-all ${isSelected ? 'bg-indigo-50' : 'bg-slate-50 hover:bg-indigo-50/50'}`}
                   >
                     <input 
                       type="checkbox" 
                       className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                       checked={isSelected}
                       onChange={() => setSelectedProjectIds(prev => isSelected ? prev.filter(id => id !== project.id) : [...prev, project.id])}
                     />
                   </div>
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

      {/* Archive Project Confirmation Modal */}
      {archiveConfirmProject && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-50 text-indigo-600">
                  {archiveConfirmProject.archived ? <RotateCcw className="w-6 h-6" /> : <Archive className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">{archiveConfirmProject.archived ? 'Restore Project?' : 'Archive Project?'}</h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    {archiveConfirmProject.archived 
                      ? 'This will restore the project to active status.'
                      : 'This will move the project to archive. You can restore it later.'}
                  </p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-sm font-bold text-slate-900 mb-1">{archiveConfirmProject.title}</p>
                <p className="text-xs text-slate-500">{companies.find(c => c.id === archiveConfirmProject.companyId)?.name || 'Standalone Project'}</p>
              </div>
            </div>
            <div className="p-6 flex gap-3">
              <button
                onClick={() => setArchiveConfirmProject(null)}
                disabled={archivingProjectId === archiveConfirmProject.id}
                className="flex-1 py-3 border border-slate-200 text-slate-400 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={() => handleArchiveProject(archiveConfirmProject.id)}
                disabled={archivingProjectId === archiveConfirmProject.id}
                className="flex-1 py-3 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {archivingProjectId === archiveConfirmProject.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {archiveConfirmProject.archived ? 'Restoring...' : 'Archiving...'}
                  </>
                ) : (
                  archiveConfirmProject.archived ? 'Restore Project' : 'Archive Project'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Project Confirmation Modal */}
      {deleteConfirmProject && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-50 text-red-600">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Delete Project?</h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    This action cannot be undone. The project and all its tasks will be permanently removed.
                  </p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-sm font-bold text-slate-900 mb-1">{deleteConfirmProject.title}</p>
                <p className="text-xs text-slate-500">{companies.find(c => c.id === deleteConfirmProject.companyId)?.name || 'Standalone Project'}</p>
              </div>
            </div>
            <div className="p-6 flex gap-3">
              <button
                onClick={() => setDeleteConfirmProject(null)}
                disabled={deletingProjectId === deleteConfirmProject.id}
                className="flex-1 py-3 border border-slate-200 text-slate-400 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProject(deleteConfirmProject.id)}
                disabled={deletingProjectId === deleteConfirmProject.id}
                className="flex-1 py-3 bg-red-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deletingProjectId === deleteConfirmProject.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Project'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedProjectIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 duration-300">
          <div className="bg-slate-900 text-white rounded-3xl shadow-2xl px-8 py-4 flex items-center gap-8 border border-white/10 ring-4 ring-indigo-500/10">
            <span className="text-sm font-black flex items-center gap-3">
              <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-[10px]">
                {selectedProjectIds.length}
              </div>
              Selected
            </span>
            <div className="h-8 w-px bg-white/10" />
            <div className="flex items-center gap-3">
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setBulkDeleteConfirmOpen(true);
                }}
                disabled={isBulkDeletingProjects}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isBulkDeletingProjects ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete
              </button>
              <button 
                onClick={() => setSelectedProjectIds([])} 
                className="p-2 hover:bg-white/10 rounded-xl text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleteConfirmOpen && selectedProjectIds.length > 0 && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-50 text-red-600">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    Delete {selectedProjectIds.length} Project{selectedProjectIds.length > 1 ? 's' : ''}?
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    This action cannot be undone. The projects and all their tasks will be permanently removed.
                  </p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 max-h-48 overflow-y-auto">
                {projects.filter(p => selectedProjectIds.includes(p.id)).slice(0, 5).map(project => {
                  const company = companies.find(c => c.id === project.companyId);
                  return (
                    <div key={project.id} className="flex items-center gap-3 mb-2 last:mb-0">
                      <FolderKanban className="w-4 h-4 text-indigo-500" />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-900">{project.title}</p>
                        <p className="text-[10px] text-slate-500">{company?.name || 'Standalone Project'}</p>
                      </div>
                    </div>
                  );
                })}
                {selectedProjectIds.length > 5 && (
                  <p className="text-xs text-slate-400 font-medium mt-2 text-center">
                    + {selectedProjectIds.length - 5} more
                  </p>
                )}
              </div>
            </div>
            <div className="p-6 flex gap-3">
              <button
                onClick={() => setBulkDeleteConfirmOpen(false)}
                disabled={isBulkDeletingProjects}
                className="flex-1 py-3 border border-slate-200 text-slate-400 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDeleteProjects}
                disabled={isBulkDeletingProjects}
                className="flex-1 py-3 bg-red-600 text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-red-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isBulkDeletingProjects ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  `Delete ${selectedProjectIds.length} Project${selectedProjectIds.length > 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Detail View Drawer */}
      {selectedProject && (
        <div className="fixed inset-0 z-[110] overflow-hidden pointer-events-none">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md pointer-events-auto animate-in fade-in duration-300" 
            onClick={() => {
              if (!isEditingProject && !isUpdatingProject) {
                setSelectedProject(null);
                setIsEditingProject(false);
              }
            }} 
          />
          <div className="absolute right-0 inset-y-0 w-full max-w-3xl bg-white shadow-2xl pointer-events-auto animate-in slide-in-from-right duration-500 flex flex-col">
            
            {/* Header */}
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 relative shrink-0">
              <button 
                onClick={() => {
                  if (!isEditingProject && !isUpdatingProject) {
                    setSelectedProject(null);
                    setIsEditingProject(false);
                  }
                }} 
                className="absolute top-6 right-6 p-2 hover:bg-white rounded-full text-slate-400 transition-all shadow-sm z-10"
                disabled={isUpdatingProject}
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-5 mb-6 pr-12">
                <div className="w-16 h-16 bg-indigo-600 rounded-[24px] flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                  <FolderKanban className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  {isEditingProject ? (
                    <div>
                      <input
                        type="text"
                        value={editFormData.title}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-4 py-2 bg-white border-2 border-indigo-200 rounded-xl text-xl font-black text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100"
                        placeholder="Project name"
                        required
                      />
                      <p className="text-[9px] text-slate-400 mt-1 px-1">
                        <span className="text-red-500">*</span> Required field
                      </p>
                    </div>
                  ) : (
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{selectedProject.title}</h2>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      selectedProject.status === 'Planning' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                      selectedProject.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                      selectedProject.status === 'On Hold' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                      'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      {selectedProject.status}
                    </span>
                    <span className="text-xs text-slate-400">
                      {companies.find(c => c.id === selectedProject.companyId)?.name || 'Standalone Project'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                {isEditingProject ? (
                  <>
                    <button
                      onClick={() => {
                        setIsEditingProject(false);
                        setEditFormData({
                          title: selectedProject.title,
                          description: selectedProject.description || '',
                          companyId: selectedProject.companyId || '',
                          status: selectedProject.status,
                          engagement: selectedProject.engagement || '',
                          startDate: formatDateForInput(selectedProject.startDate),
                          endDate: formatDateForInput(selectedProject.endDate)
                        });
                      }}
                      disabled={isUpdatingProject}
                      className="px-4 py-2 border border-slate-200 text-slate-400 font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateProject}
                      disabled={isUpdatingProject || !editFormData.title.trim() || !editFormData.engagement.trim() || !editFormData.startDate.trim() || !editFormData.endDate.trim()}
                      className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpdatingProject ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditingProject(true)}
                    className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Project
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
              {/* Project Details */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Tag className="w-4 h-4 text-indigo-500" /> Project Details
                </h3>
                <div className="space-y-4">
                  {isEditingProject ? (
                    <>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">
                          Engagement <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={editFormData.engagement}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, engagement: e.target.value }))}
                          className="w-full px-4 py-3 bg-slate-50 border-2 border-indigo-200 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-100"
                          placeholder="e.g., Consulting, Implementation, Support"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">
                            Start Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={editFormData.startDate}
                            onChange={(e) => {
                              setEditFormData(prev => ({ ...prev, startDate: e.target.value }));
                              // Validate end date if both dates are set
                              if (e.target.value && editFormData.endDate) {
                                const start = new Date(e.target.value);
                                const end = new Date(editFormData.endDate);
                                if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start >= end) {
                                  // Error will be shown on save
                                }
                              }
                            }}
                            className="w-full px-4 py-3 bg-slate-50 border-2 border-indigo-200 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-100"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">
                            End Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={editFormData.endDate}
                            onChange={(e) => {
                              setEditFormData(prev => ({ ...prev, endDate: e.target.value }));
                              // Validate end date if both dates are set
                              if (editFormData.startDate && e.target.value) {
                                const start = new Date(editFormData.startDate);
                                const end = new Date(e.target.value);
                                if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start >= end) {
                                  // Error will be shown on save
                                }
                              }
                            }}
                            className="w-full px-4 py-3 bg-slate-50 border-2 border-indigo-200 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-100"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Description</label>
                        <textarea
                          value={editFormData.description}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                          rows={4}
                          className="w-full px-4 py-3 bg-slate-50 border-2 border-indigo-200 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-100 resize-none"
                          placeholder="Project description..."
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">Company</label>
                        <select
                          value={editFormData.companyId}
                          onChange={(e) => setEditFormData(prev => ({ ...prev, companyId: e.target.value }))}
                          className="w-full px-4 py-3 bg-slate-50 border-2 border-indigo-200 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-100"
                        >
                          <option value="">Standalone Project</option>
                          {companies.map(company => (
                            <option key={company.id} value={company.id}>{company.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Name</p>
                          <p className="text-sm font-bold text-slate-900">{selectedProject.title}</p>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Engagement</p>
                          <p className="text-sm font-bold text-slate-900">{selectedProject.engagement || '—'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Start Date</p>
                          <p className="text-sm font-bold text-slate-900">
                            {selectedProject.startDate ? new Date(selectedProject.startDate).toLocaleDateString() : '—'}
                          </p>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">End Date</p>
                          <p className="text-sm font-bold text-slate-900">
                            {selectedProject.endDate ? new Date(selectedProject.endDate).toLocaleDateString() : '—'}
                          </p>
                        </div>
                      </div>
                      {selectedProject.description && (
                        <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                          <p className="text-sm text-slate-700 leading-relaxed">{selectedProject.description}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Company</p>
                          <p className="text-sm font-bold text-slate-900">{companies.find(c => c.id === selectedProject.companyId)?.name || 'Standalone Project'}</p>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Progress</p>
                          <p className="text-sm font-bold text-slate-900">{calculateProjectProgress(selectedProject.id)}%</p>
                        </div>
                      </div>

                      {/* Attached File */}
                      {selectedProject.noteImage && (
                        <div className="space-y-2">
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <FileText className="w-4 h-4 text-indigo-500" /> Attached File
                          </h3>
                          {selectedProject.noteImageMimeType?.includes('pdf') ? (
                            <div className="p-5 bg-white border-2 border-slate-200 rounded-2xl hover:border-indigo-300 transition-all group">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                                  <FileText className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-slate-900 truncate">{selectedProject.noteImageName || 'Document.pdf'}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">PDF Document</p>
                                </div>
                                <button
                                  onClick={() => {
                                    const newWindow = window.open();
                                    if (newWindow) {
                                      newWindow.document.write(`
                                        <html>
                                          <head>
                                            <title>${selectedProject.noteImageName || 'Document.pdf'}</title>
                                            <style>
                                              body { margin: 0; padding: 0; }
                                              embed { width: 100vw; height: 100vh; }
                                            </style>
                                          </head>
                                          <body>
                                            <embed src="${selectedProject.noteImage}" type="application/pdf" width="100%" height="100%" />
                                          </body>
                                        </html>
                                      `);
                                    }
                                  }}
                                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 opacity-0 group-hover:opacity-100"
                                >
                                  <Eye className="w-4 h-4" />
                                  View PDF
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="relative group">
                              <img
                                src={selectedProject.noteImage}
                                alt={selectedProject.noteImageName || 'Attachment'}
                                className="w-full max-h-80 object-contain rounded-2xl border-2 border-slate-200 cursor-pointer hover:border-indigo-300 transition-all"
                                onClick={() => {
                                  setViewerImageUrl(selectedProject.noteImage || '');
                                  setImageViewerOpen(true);
                                }}
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 rounded-2xl transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg">
                                  <Eye className="w-5 h-5 text-indigo-600" />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Status Change */}
              {!isEditingProject && (
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-500" /> Change Status
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {(['Planning', 'Active', 'On Hold', 'Completed'] as Project['status'][]).map(status => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        disabled={isUpdatingProject || selectedProject.status === status}
                        className={`flex items-center gap-2 p-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                          selectedProject.status === status
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed'
                        }`}
                      >
                        {selectedProject.status === status ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Tasks */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-indigo-500" /> Related Tasks
                  </h3>
                  <button
                    onClick={() => {
                      sessionStorage.setItem('selectedProjectId', selectedProject.id);
                      onNavigate('tasks');
                      setSelectedProject(null);
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    View All Tasks
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                {(() => {
                  const projectTasks = tasks.filter(t => t.projectId === selectedProject.id);
                  if (projectTasks.length === 0) {
                    return (
                      <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
                        <Box className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-400 font-bold">No tasks found for this project</p>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-2">
                      {projectTasks.map(task => {
                        const assignee = users.find(u => u.id === task.assigneeId);
                        const isUpdating = updatingTaskId === task.id;
                        return (
                          <div
                            key={task.id}
                            className="p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isUpdating) {
                                        handleToggleTaskStatus(task.id, task.status);
                                      }
                                    }}
                                    disabled={isUpdating}
                                    className="disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isUpdating ? (
                                      <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                                    ) : task.status === 'Done' ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500 hover:text-emerald-600 transition-colors" />
                                    ) : (
                                      <Circle className="w-4 h-4 text-slate-300 hover:text-indigo-500 transition-colors cursor-pointer" />
                                    )}
                                  </button>
                                  <p className={`text-sm font-bold ${task.status === 'Done' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                                    {task.title}
                                  </p>
                                </div>
                                {task.description && (
                                  <p className="text-xs text-slate-500 line-clamp-1 ml-6">{task.description}</p>
                                )}
                                <div className="flex items-center gap-3 mt-2 ml-6">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                    task.priority === 'High' ? 'bg-red-50 text-red-600' :
                                    task.priority === 'Medium' ? 'bg-amber-50 text-amber-600' :
                                    'bg-slate-50 text-slate-600'
                                  }`}>
                                    {task.priority}
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">{task.status}</span>
                                  {task.dueDate && (
                                    <span className="text-[9px] text-slate-400 font-bold flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {task.dueDate}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {assignee && (
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 text-xs font-black">
                                    {assignee.name.charAt(0)}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Activity Timeline Section */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-500" /> Email Activity Timeline
                  </h3>
                </div>
                {isLoadingActivities ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  </div>
                ) : projectActivities.length === 0 ? (
                  <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-3xl">
                    <Mail className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-sm font-bold text-slate-400">No email activities yet</p>
                    <p className="text-xs text-slate-400 mt-1">Email activities will appear here when emails are linked to this project</p>
                  </div>
                ) : (
                  <div className="relative border-l-2 border-slate-100 ml-4 pl-10 space-y-12">
                    {projectActivities.map((activity, idx) => {
                      const activityDate = new Date(activity.createdAt);
                      const now = new Date();
                      const diffMs = now.getTime() - activityDate.getTime();
                      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                      let timeLabel = '';
                      if (diffDays === 0) timeLabel = 'Today';
                      else if (diffDays === 1) timeLabel = 'Yesterday';
                      else if (diffDays < 7) timeLabel = `${diffDays} days ago`;
                      else if (diffDays < 30) timeLabel = `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
                      else timeLabel = `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
                      
                      const isEmailLinked = activity.activityType === 'email_linked';
                      const borderColor = isEmailLinked ? 'border-indigo-600' : 'border-slate-200';
                      const dotColor = isEmailLinked ? 'bg-indigo-600' : 'bg-slate-300';
                      const textColor = isEmailLinked ? 'text-indigo-600' : 'text-slate-400';
                      
                      return (
                        <div key={activity.id || idx} className="relative">
                          <div className={`absolute -left-[51px] top-1.5 w-8 h-8 rounded-full bg-white border-2 ${borderColor} shadow-xl flex items-center justify-center`}>
                            {isEmailLinked ? (
                              <Mail className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                            )}
                          </div>
                          <p className={`text-[10px] font-black ${textColor} uppercase mb-1 tracking-widest`}>
                            {isEmailLinked ? 'Email Linked' : activity.activityType || 'Activity'} • {timeLabel}
                          </p>
                          <h4 className="text-sm font-black text-slate-900">{activity.title || 'Email Activity'}</h4>
                          <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-sm">{activity.description || activity.title}</p>
                          {activity.emailId && (
                            <button
                              onClick={() => {
                                onNavigate('inbox');
                                setTimeout(() => {
                                  window.location.hash = `email=${activity.emailId}`;
                                }, 100);
                              }}
                              className="mt-3 text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1.5"
                            >
                              <ExternalLink className="w-3 h-3" /> View Email
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 border-t border-slate-100 bg-white flex gap-4 shrink-0">
              <button 
                onClick={() => {
                  if (!isEditingProject && !isUpdatingProject) {
                    setSelectedProject(null);
                    setIsEditingProject(false);
                  }
                }} 
                className="flex-1 py-4 bg-slate-900 text-white font-black uppercase text-xs tracking-[0.2em] rounded-[24px] hover:bg-indigo-700 active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-3"
                disabled={isUpdatingProject}
              >
                <CheckCircle2 className="w-5 h-5" /> Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {imageViewerOpen && (
        <div className="fixed inset-0 z-[150] overflow-hidden">
          <div 
            className="absolute inset-0 bg-slate-900/95 backdrop-blur-md animate-in fade-in duration-300" 
            onClick={() => setImageViewerOpen(false)} 
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <button
              onClick={() => setImageViewerOpen(false)}
              className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-10 backdrop-blur-sm"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="relative max-w-7xl max-h-[90vh] animate-in zoom-in-95 duration-300">
              <img
                src={viewerImageUrl}
                alt="Full size"
                className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
