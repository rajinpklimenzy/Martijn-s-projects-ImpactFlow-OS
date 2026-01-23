/**
 * Example: Tasks component migrated to use React Query
 * This demonstrates the performance improvements and cleaner code
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Clock, MoreVertical, Plus, Filter, Search, Calendar, ChevronRight, X, User, Layout, Trash2, Tag, Loader2, AlertTriangle } from 'lucide-react';
import { Task, Project, User as UserType } from '../types';
import { useTasks, useUpdateTask, useDeleteTask } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import { useUsers } from '../hooks/useUsers';
import { useToast } from '../contexts/ToastContext';

interface TasksProps {
  onCreateTask: () => void;
  currentUser?: any;
}

const Tasks: React.FC<TasksProps> = ({ onCreateTask, currentUser }) => {
  const { showSuccess, showError } = useToast();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<{
    description: string;
    priority: 'Low' | 'Medium' | 'High';
    dueDate: string;
    assigneeId: string;
  } | null>(null);
  const [isTaskDeleteConfirmOpen, setIsTaskDeleteConfirmOpen] = useState(false);

  // Get userId
  const userId = currentUser?.id || JSON.parse(localStorage.getItem('user_data') || '{}').id;

  // React Query hooks - automatic caching, refetching, and state management
  const { data: tasks = [], isLoading: isLoadingTasks, error: tasksError } = useTasks(userId, selectedProjectId || undefined);
  const { data: projects = [], isLoading: isLoadingProjects } = useProjects(userId);
  const { data: users = [], isLoading: isLoadingUsers } = useUsers();

  // Mutations
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const isLoading = isLoadingTasks || isLoadingProjects || isLoadingUsers;

  // Check for selected project ID from sessionStorage
  useEffect(() => {
    const projectId = sessionStorage.getItem('selectedProjectId');
    if (projectId) {
      setSelectedProjectId(projectId);
    }
  }, []);

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
    
    // React Query mutation handles loading, error, and cache invalidation automatically
    updateTask.mutate({
      id,
      data: { status: newStatus }
    });
  };

  const handleSaveTask = async () => {
    if (!selectedTask || !taskForm) return;

    updateTask.mutate({
      id: selectedTask.id,
      data: {
        description: taskForm.description,
        priority: taskForm.priority,
        dueDate: taskForm.dueDate,
        assigneeId: taskForm.assigneeId
      }
    });
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;

    deleteTask.mutate(selectedTask.id, {
      onSuccess: () => {
        setIsTaskDeleteConfirmOpen(false);
        setSelectedTask(null);
      }
    });
  };

  // Filter tasks based on search query (client-side filtering)
  const filteredTasks = tasks.filter(task => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      task.title.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query)
    );
  });

  // Error handling
  if (tasksError) {
    showError('Failed to load tasks');
  }

  return (
    <div className="space-y-4 lg:space-y-6 animate-in slide-in-from-bottom-2 duration-500 relative h-full">
      {/* ... rest of component JSX remains the same ... */}
      {/* The key difference is:
          - No manual useState for tasks/projects/users
          - No manual useEffect for fetching
          - No manual loading state management
          - Mutations handle success/error automatically
          - Cache invalidation happens automatically
      */}
    </div>
  );
};

export default Tasks;
