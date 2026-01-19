
import React, { useState } from 'react';
import { MOCK_TASKS, MOCK_USERS, MOCK_PROJECTS } from '../constants';
import { CheckCircle2, Circle, Clock, MoreVertical, Plus, Filter, Search, Calendar, ChevronRight, X, User, Layout, Trash2, Tag } from 'lucide-react';
import { Task } from '../types';

interface TasksProps {
  onCreateTask: () => void;
}

const Tasks: React.FC<TasksProps> = ({ onCreateTask }) => {
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'High': return 'text-red-500 bg-red-50';
      case 'Medium': return 'text-amber-500 bg-amber-50';
      default: return 'text-blue-500 bg-blue-50';
    }
  };

  const toggleTaskStatus = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: t.status === 'Done' ? 'Todo' : 'Done' } : t));
  };

  return (
    <div className="space-y-4 lg:space-y-6 animate-in slide-in-from-bottom-2 duration-500 relative h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold">My Tasks</h1>
          <p className="text-slate-500 text-xs lg:text-sm">Manage implementation goals for {tasks.length} items</p>
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
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 shadow-sm text-sm"
          />
        </div>
        <button className="px-3 py-2 bg-white border border-slate-200 rounded-xl flex items-center gap-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filter</span>
        </button>
      </div>

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
          {tasks.map(task => {
            const project = MOCK_PROJECTS.find(p => p.id === task.projectId);
            const assignee = MOCK_USERS.find(u => u.id === task.assigneeId);
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
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{project?.title}</span>
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
                  <img src={assignee?.avatar} alt={assignee?.name} className="w-6 h-6 rounded-full border border-slate-200" />
                  <ChevronRight className={`w-4 h-4 transition-all ${selectedTask?.id === task.id ? 'text-indigo-600 translate-x-1' : 'text-slate-200 group-hover:text-indigo-400 group-hover:translate-x-1'}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="lg:hidden space-y-3">
        {tasks.map(task => {
          const project = MOCK_PROJECTS.find(p => p.id === task.projectId);
          const assignee = MOCK_USERS.find(u => u.id === task.assigneeId);
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
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">{project?.title}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold">
                    <Calendar className="w-3 h-3" />
                    {task.dueDate}
                  </div>
                  <img src={assignee?.avatar} className="w-5 h-5 rounded-full border border-slate-200 shadow-sm" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Detail Drawer */}
      {selectedTask && (
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
                  <p className="text-xs text-slate-500">Implemented by {MOCK_USERS.find(u => u.id === selectedTask.assigneeId)?.name}</p>
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
                  defaultValue={selectedTask.description}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm min-h-[120px] focus:ring-2 focus:ring-indigo-100 outline-none resize-none transition-all"
                  placeholder="Task description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Layout className="w-3.5 h-3.5" /> Project</h3>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between group cursor-pointer hover:border-indigo-200 transition-all">
                    <span className="text-sm font-bold text-slate-700 truncate">{MOCK_PROJECTS.find(p => p.id === selectedTask.projectId)?.title}</span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-all" />
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Tag className="w-3.5 h-3.5" /> Priority</h3>
                  <select defaultValue={selectedTask.priority} className={`w-full px-4 py-2.5 rounded-xl text-sm font-bold border outline-none focus:ring-2 focus:ring-indigo-100 transition-all ${getPriorityColor(selectedTask.priority)} border-transparent`}>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Due Date</h3>
                  <input type="date" defaultValue={selectedTask.dueDate} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100 transition-all" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><User className="w-3.5 h-3.5" /> Assignee</h3>
                  <select defaultValue={selectedTask.assigneeId} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100 transition-all">
                    {MOCK_USERS.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
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
              <button className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">Save Task</button>
              <button className="px-5 py-3 border border-slate-200 bg-white text-red-500 hover:bg-red-50 rounded-xl transition-all">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
