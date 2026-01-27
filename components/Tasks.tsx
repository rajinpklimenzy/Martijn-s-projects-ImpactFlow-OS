
import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Clock, MoreVertical, Plus, Filter, Search, Calendar, ChevronRight, X, User, Layout, Trash2, Tag, Loader2, CheckSquare } from 'lucide-react';
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
  
  // Selection State
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [taskForm, setTaskForm] = useState<{
    description: string;
    priority: 'Low' | 'Medium' | 'High';
    dueDate: string;
    assigneeId: string;
  } | null>(null);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [isTaskDeleteConfirmOpen, setIsTaskDeleteConfirmOpen] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  useEffect(() => {
    const projectId = sessionStorage.getItem('selectedProjectId');
    if (projectId) {
      setSelectedProjectId(projectId);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
        const tasksResponse = await apiGetTasks(userId);
        const fetchedTasks = tasksResponse?.data || tasksResponse || [];
        setTasks(Array.isArray(fetchedTasks) ? fetchedTasks : []);

        try {
          const projectsResponse = await apiGetProjects();
          setProjects(projectsResponse?.data || projectsResponse || []);
        } catch (err) {
          setProjects([]);
        }

        try {
          const usersResponse = await apiGetUsers();
          setUsers(usersResponse?.data || usersResponse || []);
        } catch (err) {
          setUsers([]);
        }
      } catch (err: any) {
        showError(err.message || 'Failed to load tasks');
        setTasks([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [currentUser]);

  useEffect(() => {
    const handleRefresh = async () => {
      const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;
      try {
        const tasksResponse = await apiGetTasks(userId);
        const fetchedTasks = tasksResponse?.data || tasksResponse || [];
        setTasks(Array.isArray(fetchedTasks) ? fetchedTasks : []);
      } catch (err) {}
    };
    window.addEventListener('refresh-tasks', handleRefresh);
    return () => window.removeEventListener('refresh-tasks', handleRefresh);
  }, [currentUser]);

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
    }
  }, [selectedTask]);

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'High': return 'text-red-500 bg-red-50';
      case 'Medium': return 'text-amber-500 bg-amber-50';
      default: return 'text-blue-500 bg-blue-50';
    }
  };

  // Filter tasks based on selected project and search query
  const filteredTasks = tasks.filter(task => {
    if (selectedProjectId && task.projectId !== selectedProjectId) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      task.title.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query)
    );
  });

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTaskIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    if (selectedTaskIds.length === filteredTasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(filteredTasks.map(t => t.id));
    }
  };

  const toggleTaskStatus = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newStatus = task.status === 'Done' ? 'Todo' : 'Done';
    try {
      await apiUpdateTask(id, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
      if (selectedTask?.id === id) setSelectedTask({ ...selectedTask, status: newStatus });
      showSuccess(newStatus === 'Done' ? 'Task marked as done' : 'Task marked as todo');
    } catch (err: any) {
      showError('Failed to update status');
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedTaskIds.length) return;
    setIsBulkDeleting(true);
    try {
      await Promise.all(selectedTaskIds.map(id => apiDeleteTask(id)));
      setTasks(prev => prev.filter(t => !selectedTaskIds.includes(t.id)));
      showSuccess(`Deleted ${selectedTaskIds.length} tasks successfully`);
      setSelectedTaskIds([]);
    } catch (err) {
      showError('Failed to delete some tasks');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkStatus = async (status: 'Todo' | 'Done') => {
    if (!selectedTaskIds.length) return;
    try {
      await Promise.all(selectedTaskIds.map(id => apiUpdateTask(id, { status })));
      setTasks(prev => prev.map(t => selectedTaskIds.includes(t.id) ? { ...t, status } : t));
      showSuccess(`Updated ${selectedTaskIds.length} tasks to ${status}`);
      setSelectedTaskIds([]);
    } catch (err) {
      showError('Failed to update some tasks');
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6 animate-in slide-in-from-bottom-2 duration-500 relative h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">My Tasks</h1>
          <div className="flex items-center gap-2">
            <p className="text-slate-500 text-xs lg:text-sm">Manage implementation goals for {filteredTasks.length} items</p>
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
                  <span>Project: {projects.find(p => p.id === selectedProjectId)?.title}</span>
                  <X className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        </div>
        <button onClick={onCreateTask} className="p-2 lg:px-4 lg:py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md">
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
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed border-slate-300 rounded-2xl text-center">
          <CheckCircle2 className="w-8 h-8 text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">{searchQuery ? 'No tasks found' : 'No Tasks Found'}</h3>
          <button onClick={onCreateTask} className="mt-6 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg flex items-center gap-2 hover:bg-indigo-700 shadow-sm"><Plus className="w-4 h-4" /> Create Your First Task</button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 px-6 py-4 border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <div className="col-span-1 flex items-center">
              <input 
                type="checkbox" 
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                checked={filteredTasks.length > 0 && selectedTaskIds.length === filteredTasks.length}
                onChange={selectAllFiltered}
              />
            </div>
            <div className="col-span-5">Task Name</div>
            <div className="col-span-2">Project</div>
            <div className="col-span-1 text-center">Priority</div>
            <div className="col-span-2 text-center">Due Date</div>
            <div className="col-span-1 text-right">Assignee</div>
          </div>
          <div className="divide-y divide-slate-100">
            {filteredTasks.map(task => {
              const project = projects.find(p => p.id === task.projectId);
              const assignee = users.find(u => u.id === task.assigneeId);
              const isItemSelected = selectedTaskIds.includes(task.id);
              return (
                <div 
                  key={task.id} 
                  onClick={() => setSelectedTask(task)}
                  className={`grid grid-cols-12 px-6 py-4 items-center transition-colors group cursor-pointer ${isItemSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}`}
                >
                  <div className="col-span-1 flex items-center" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                      checked={isItemSelected}
                      onChange={(e) => setSelectedTaskIds(prev => 
                        isItemSelected ? prev.filter(id => id !== task.id) : [...prev, task.id]
                      )}
                    />
                  </div>
                  <div className="col-span-5 flex items-center gap-3">
                    <button 
                      onClick={(e) => toggleTaskStatus(task.id, e)} 
                      className="text-slate-300 hover:text-indigo-600"
                    >
                      {task.status === 'Done' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5" />}
                    </button>
                    <div className="overflow-hidden">
                      <p className={`text-sm font-semibold truncate ${task.status === 'Done' ? 'line-through text-slate-400' : 'text-slate-900'}`}>{task.title}</p>
                    </div>
                  </div>
                  <div className="col-span-2 text-xs font-bold text-slate-500 truncate">{project?.title || 'No project'}</div>
                  <div className="col-span-1 text-center">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                  </div>
                  <div className="col-span-2 text-center text-xs text-slate-500 font-medium">{task.dueDate}</div>
                  <div className="col-span-1 flex justify-end">
                    <ImageWithFallback src={assignee?.avatar} fallbackText={assignee?.name || 'U'} className="w-6 h-6" isAvatar />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedTaskIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-10 duration-300">
          <div className="bg-slate-900 text-white rounded-2xl shadow-2xl px-6 py-3 flex items-center gap-6 border border-white/10">
            <span className="text-sm font-bold flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-indigo-400" />
              {selectedTaskIds.length} tasks selected
            </span>
            <div className="h-6 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleBulkStatus('Done')}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Done
              </button>
              <button 
                onClick={() => handleBulkStatus('Todo')}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-all"
              >
                Mark Todo
              </button>
              <button 
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isBulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Delete
              </button>
              <button onClick={() => setSelectedTaskIds([])} className="p-1.5 hover:bg-white/10 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Drawer (Simplified for brevity) */}
      {selectedTask && (
        <div className="fixed inset-0 z-[70] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-auto" onClick={() => setSelectedTask(null)} />
          <div className="absolute right-0 inset-y-0 w-full max-w-xl bg-white shadow-2xl pointer-events-auto animate-in slide-in-from-right duration-500">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold">{selectedTask.title}</h2>
              <button onClick={() => setSelectedTask(null)} className="p-2 hover:bg-white rounded-full text-slate-400 shadow-sm"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-8 space-y-6">
              <p className="text-sm text-slate-600">{selectedTask.description}</p>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Priority</label>
                  <p className="font-bold">{selectedTask.priority}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Due Date</label>
                  <p className="font-bold">{selectedTask.dueDate}</p>
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
