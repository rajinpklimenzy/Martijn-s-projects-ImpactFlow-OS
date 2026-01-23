
import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Clock, MoreVertical, Plus, Filter, Search, Calendar, ChevronRight, X, User, Layout, Trash2, Tag, Loader2 } from 'lucide-react';
import { Task, Project, User as UserType } from '../types';
import { apiGetTasks, apiUpdateTask, apiDeleteTask, apiGetProjects, apiGetUsers } from '../utils/api';
import { useToast } from '../contexts/ToastContext';
import { ImageWithFallback } from './common';

interface TasksProps {
  onCreateTask: () => void;
  currentUser?: any;
}

const Tasks: React.FC<TasksProps> = ({ onCreateTask, currentUser }) => {
  const { showSuccess, showError } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<{
    description: string;
    priority: 'Low' | 'Medium' | 'High';
    dueDate: string;
    assigneeId: string;
  } | null>(null);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [isTaskDeleteConfirmOpen, setIsTaskDeleteConfirmOpen] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  // Check for selected project ID from sessionStorage
  useEffect(() => {
    const projectId = sessionStorage.getItem('selectedProjectId');
    if (projectId) {
      setSelectedProjectId(projectId);
      // Clear it after reading so it doesn't persist if user navigates away
      // We'll clear it when user explicitly wants to see all tasks
    }
  }, []);

  // Fetch tasks, projects, and users
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
        
        // Fetch tasks
        const tasksResponse = await apiGetTasks(userId);
        const fetchedTasks = tasksResponse?.data || tasksResponse || [];
        setTasks(Array.isArray(fetchedTasks) ? fetchedTasks : []);

        // Fetch projects
        try {
          const projectsResponse = await apiGetProjects();
          setProjects(projectsResponse?.data || projectsResponse || []);
        } catch (err) {
          console.error('Failed to fetch projects:', err);
          setProjects([]);
        }

        // Fetch users
        try {
          const usersResponse = await apiGetUsers();
          setUsers(usersResponse?.data || usersResponse || []);
        } catch (err) {
          console.error('Failed to fetch users:', err);
          setUsers([]);
        }
      } catch (err: any) {
        console.error('[TASKS] Failed to fetch tasks data:', err);
        showError(err.message || 'Failed to load tasks');
        setTasks([]);
        setProjects([]);
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  // Listen for task creation/update events
  useEffect(() => {
    const handleRefresh = async () => {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      try {
        const tasksResponse = await apiGetTasks(userId);
        const fetchedTasks = tasksResponse?.data || tasksResponse || [];
        setTasks(Array.isArray(fetchedTasks) ? fetchedTasks : []);
      } catch (err) {
        console.error('Failed to refresh tasks:', err);
      }
    };

    window.addEventListener('refresh-tasks', handleRefresh);
    return () => window.removeEventListener('refresh-tasks', handleRefresh);
  }, [currentUser]);

  // Initialize task form when a task is selected
  useEffect(() => {
    if (selectedTask) {
      setTaskForm({
        description: selectedTask.description || '',
        priority: selectedTask.priority || 'Medium',
        dueDate: selectedTask.dueDate || '',
        assigneeId: selectedTask.assigneeId || ''
      });
    } else {
      setTaskForm(null);
      setIsTaskDeleteConfirmOpen(false);
    }
  }, [selectedTask]);

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'High': return 'text-red-500 bg-red-50';
      case 'Medium': return 'text-amber-500 bg-amber-50';
      default: return 'text-blue-500 bg-blue-50';
    }
  };

  const toggleTaskStatus = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newStatus = task.status === 'Done' ? 'Todo' : 'Done';
    
    try {
      await apiUpdateTask(id, { status: newStatus });
      
      // Update local state optimistically
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
      
      // Update selected task if it's the one being toggled
      if (selectedTask?.id === id) {
        setSelectedTask({ ...selectedTask, status: newStatus });
      }
      
      showSuccess(newStatus === 'Done' ? 'Task marked as done' : 'Task marked as todo');
    } catch (err: any) {
      console.error('Failed to update task status:', err);
      showError(err.message || 'Failed to update task status');
    }
  };

  // Filter tasks based on selected project and search query
  const filteredTasks = tasks.filter(task => {
    // Filter by selected project if one is selected
    if (selectedProjectId && task.projectId !== selectedProjectId) {
      return false;
    }
    
    // Filter by search query
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      task.title.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-4 lg:space-y-6 animate-in slide-in-from-bottom-2 duration-500 relative h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">My Tasks</h1>
          <div className="flex items-center gap-2">
            <p className="text-slate-500 text-xs lg:text-sm">Manage implementation goals for {filteredTasks.length} {filteredTasks.length === 1 ? 'item' : 'items'}</p>
            {selectedProjectId && (
              <>
                <span className="text-slate-300">•</span>
                <button
                  onClick={() => {
                    setSelectedProjectId(null);
                    sessionStorage.removeItem('selectedProjectId');
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
                >
                  <span>Showing tasks for: {projects.find(p => p.id === selectedProjectId)?.title || 'Project'}</span>
                  <X className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        </div>
        <button 
          onClick={onCreateTask}
          className="p-2 lg:px-4 lg:py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md"
        >
          <Plus className="w-5 h-5 lg:w-4 lg:h-4" />
          <span className="hidden lg:inline">Create Task</span>
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search tasks..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 shadow-sm text-sm"
          />
        </div>
        <button className="px-3 py-2 bg-white border border-slate-200 rounded-xl flex items-center gap-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filter</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-slate-300 rounded-2xl text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            {searchQuery ? 'No tasks found' : 'No Tasks Found'}
          </h3>
          <p className="text-slate-500 text-sm mb-6">
            {searchQuery ? 'Try a different search term.' : 'Get started by creating your first task.'}
          </p>
          {!searchQuery && (
            <button 
              onClick={onCreateTask}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create Your First Task
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="grid grid-cols-12 px-6 py-4 border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <div className="col-span-6">Task Name</div>
              <div className="col-span-2">Project</div>
              <div className="col-span-1 text-center">Priority</div>
              <div className="col-span-2 text-center">Due Date</div>
              <div className="col-span-1 text-right">Assignee</div>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredTasks.map(task => {
                const project = projects.find(p => p.id === task.projectId);
                const assignee = users.find(u => u.id === task.assigneeId);
            return (
              <div 
                key={task.id} 
                onClick={() => setSelectedTask(task)}
                className={`grid grid-cols-12 px-6 py-4 items-center transition-colors group cursor-pointer active:bg-indigo-50/30 ${selectedTask?.id === task.id ? 'bg-indigo-50/40' : 'hover:bg-slate-50'}`}
              >
                <div className="col-span-6 flex items-center gap-3">
                  <button 
                    onClick={(e) => toggleTaskStatus(task.id, e)} 
                    className="text-slate-300 hover:text-indigo-600 transition-colors"
                  >
                    {task.status === 'Done' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5" />}
                  </button>
                  <div className="flex-1 overflow-hidden">
                    <p className={`text-sm font-semibold text-slate-900 group-hover:text-indigo-600 truncate transition-colors ${task.status === 'Done' ? 'line-through opacity-50 text-slate-400' : ''}`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{task.description}</p>
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{project?.title || 'No project'}</span>
                </div>
                <div className="col-span-1 text-center">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
                <div className="col-span-2 text-center text-xs text-slate-500 font-medium">
                  {task.dueDate}
                </div>
                <div className="col-span-1 flex justify-end gap-3 items-center">
                  <ImageWithFallback
                    src={assignee?.avatar}
                    alt={assignee?.name || 'Unknown'}
                    fallbackText={assignee?.name || assignee?.email || 'U'}
                    className="w-6 h-6 border border-slate-200"
                    isAvatar={true}
                  />
                  <ChevronRight className={`w-4 h-4 transition-all ${selectedTask?.id === task.id ? 'text-indigo-600 translate-x-1' : 'text-slate-200 group-hover:text-indigo-400 group-hover:translate-x-1'}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

          {/* Mobile Card List */}
          <div className="lg:hidden space-y-3">
            {filteredTasks.map(task => {
              const project = projects.find(p => p.id === task.projectId);
              const assignee = users.find(u => u.id === task.assigneeId);
          return (
            <div 
              key={task.id} 
              onClick={() => setSelectedTask(task)}
              className={`p-4 rounded-xl border transition-colors cursor-pointer group space-y-3 ${selectedTask?.id === task.id ? 'bg-indigo-50 border-indigo-600' : 'bg-white border-slate-200 shadow-sm'}`}
            >
              <div className="flex items-start gap-3">
                <button onClick={(e) => toggleTaskStatus(task.id, e)} className="text-slate-300 pt-1">
                  {task.status === 'Done' ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <Circle className="w-6 h-6" />}
                </button>
                <div className="flex-1 overflow-hidden">
                  <h4 className={`font-bold text-slate-900 text-sm truncate group-hover:text-indigo-600 transition-colors ${task.status === 'Done' ? 'line-through opacity-50' : ''}`}>{task.title}</h4>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{task.description}</p>
                </div>
                <button className="p-1 text-slate-400">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-50 gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">{project?.title || 'No project'}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold">
                    <Calendar className="w-3 h-3" />
                    {task.dueDate}
                  </div>
                  <ImageWithFallback
                    src={assignee?.avatar}
                    alt={assignee?.name || 'Unknown'}
                    fallbackText={assignee?.name || assignee?.email || 'U'}
                    className="w-5 h-5 border border-slate-200 shadow-sm"
                    isAvatar={true} 
                  />
                </div>
              </div>
            </div>
          );
        })}
          </div>
        </>
      )}

      {/* Task Detail Drawer */}
      {selectedTask && taskForm && (
        <div className="fixed inset-0 z-[70] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300" onClick={() => setSelectedTask(null)} />
          <div className="absolute right-0 inset-y-0 w-full max-w-xl bg-white shadow-2xl pointer-events-auto animate-in slide-in-from-right duration-500 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <button 
                  onClick={(e) => toggleTaskStatus(selectedTask.id, e as any)} 
                  className="transition-colors"
                >
                  {selectedTask.status === 'Done' ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <Circle className="w-6 h-6 text-slate-300" />}
                </button>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedTask.title}</h2>
                  <p className="text-xs text-slate-500">Implemented by {users.find(u => u.id === selectedTask.assigneeId)?.name || 'Unknown'}</p>
                </div>
              </div>
              <button onClick={() => setSelectedTask(null)} className="p-2 hover:bg-white rounded-full text-slate-400 shadow-sm border border-transparent hover:border-slate-200 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Description</h3>
                <textarea 
                  value={taskForm.description}
                  onChange={(e) => setTaskForm(prev => prev ? { ...prev, description: e.target.value } : prev)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm min-h-[120px] focus:ring-2 focus:ring-indigo-100 outline-none resize-none transition-all"
                  placeholder="Task description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Layout className="w-3.5 h-3.5" /> Project</h3>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between group cursor-pointer hover:border-indigo-200 transition-all">
                    <span className="text-sm font-bold text-slate-700 truncate">{projects.find(p => p.id === selectedTask.projectId)?.title || 'No project'}</span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-all" />
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Tag className="w-3.5 h-3.5" /> Priority</h3>
                  <select
                    value={taskForm.priority}
                    onChange={(e) =>
                      setTaskForm(prev => prev ? { ...prev, priority: e.target.value as 'Low' | 'Medium' | 'High' } : prev)
                    }
                    className={`w-full px-4 py-2.5 rounded-xl text-sm font-bold border outline-none focus:ring-2 focus:ring-indigo-100 transition-all ${getPriorityColor(taskForm.priority)} border-transparent`}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Due Date</h3>
                  <input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm(prev => prev ? { ...prev, dueDate: e.target.value } : prev)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><User className="w-3.5 h-3.5" /> Assignee</h3>
                  <select
                    value={taskForm.assigneeId}
                    onChange={(e) =>
                      setTaskForm(prev => prev ? { ...prev, assigneeId: e.target.value } : prev)
                    }
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                  >
                    {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4" /> This task is synced with ImpactFlow Automation Engine.
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
              <button
                onClick={async () => {
                  if (!selectedTask || !taskForm || isSavingTask) return;
                  setIsSavingTask(true);
                  try {
                    await apiUpdateTask(selectedTask.id, {
                      description: taskForm.description,
                      priority: taskForm.priority,
                      dueDate: taskForm.dueDate,
                      assigneeId: taskForm.assigneeId
                    });

                    // Update local state
                    setTasks(prev =>
                      prev.map(t =>
                        t.id === selectedTask.id ? { ...t, ...taskForm } : t
                      )
                    );
                    setSelectedTask(prev => (prev ? { ...prev, ...taskForm } : prev));
                    showSuccess('Task updated successfully!');
                    window.dispatchEvent(new Event('refresh-tasks'));
                  } catch (err: any) {
                    console.error('Failed to update task:', err);
                    showError(err.message || 'Failed to update task');
                  } finally {
                    setIsSavingTask(false);
                  }
                }}
                disabled={isSavingTask}
                className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSavingTask ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Task'
                )}
              </button>
              <button
                onClick={() => setIsTaskDeleteConfirmOpen(true)}
                className="px-5 py-3 border border-slate-200 bg-white text-red-500 hover:bg-red-50 rounded-xl transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Task Confirmation Modal */}
      {isTaskDeleteConfirmOpen && selectedTask && (
        <div className="fixed inset-0 z-[80] overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300"
            onClick={() => setIsTaskDeleteConfirmOpen(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl pointer-events-auto animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Delete Task</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">
                      This action cannot be undone
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsTaskDeleteConfirmOpen(false)}
                  className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors shadow-sm"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600">
                  Are you sure you want to delete{' '}
                  <span className="font-bold text-slate-900">{selectedTask.title}</span>?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-xs text-red-700 font-semibold mb-1">⚠️ Warning:</p>
                  <p className="text-xs text-red-600">
                    This will permanently delete the task from the project. This action cannot be undone.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsTaskDeleteConfirmOpen(false)}
                    disabled={isDeletingTask}
                    className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!selectedTask || isDeletingTask) return;
                      setIsDeletingTask(true);
                      try {
                        await apiDeleteTask(selectedTask.id);
                        setTasks(prev => prev.filter(t => t.id !== selectedTask.id));
                        setSelectedTask(null);
                        setIsTaskDeleteConfirmOpen(false);
                        showSuccess('Task deleted successfully!');
                        window.dispatchEvent(new Event('refresh-tasks'));
                      } catch (err: any) {
                        console.error('Failed to delete task:', err);
                        showError(err.message || 'Failed to delete task');
                      } finally {
                        setIsDeletingTask(false);
                      }
                    }}
                    disabled={isDeletingTask}
                    className="flex-[2] py-3 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isDeletingTask ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Delete Task
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

export default Tasks;
