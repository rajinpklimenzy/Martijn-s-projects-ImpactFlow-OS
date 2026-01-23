import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetTasks, apiCreateTask, apiUpdateTask, apiDeleteTask } from '../utils/api';
import { Task } from '../types';
import { useToast } from '../contexts/ToastContext';

// Query keys
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters?: { userId?: string; projectId?: string; status?: string }) => 
    [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

// Get all tasks
export const useTasks = (userId?: string, projectId?: string, status?: string) => {
  return useQuery({
    queryKey: taskKeys.list({ userId, projectId, status }),
    queryFn: async () => {
      const response = await apiGetTasks(userId, projectId, status);
      return response.data || response || [];
    },
    enabled: !!userId, // Only fetch if userId is provided
    staleTime: 30 * 1000, // 30 seconds - refetch in background after 30 seconds
    refetchInterval: 60 * 1000, // Refetch every 60 seconds in background
    // Keep showing cached data while refetching in background for smooth updates
    placeholderData: (previousData) => previousData,
  });
};

// Get single task
export const useTask = (id: string) => {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: async () => {
      const response = await apiGetTasks();
      const tasks = response.data || response || [];
      return tasks.find((t: Task) => t.id === id);
    },
    enabled: !!id,
  });
};

// Create task mutation
export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (taskData: Partial<Task>) => {
      const response = await apiCreateTask(taskData);
      return response.data || response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      showSuccess('Task created successfully!');
      window.dispatchEvent(new Event('refresh-tasks'));
    },
    onError: (error: any) => {
      showError(error.message || 'Failed to create task');
    },
  });
};

// Update task mutation
export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Task> }) => {
      const response = await apiUpdateTask(id, data);
      return response.data || response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.id) });
      showSuccess('Task updated successfully!');
      window.dispatchEvent(new Event('refresh-tasks'));
    },
    onError: (error: any) => {
      showError(error.message || 'Failed to update task');
    },
  });
};

// Delete task mutation
export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiDeleteTask(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      showSuccess('Task deleted successfully!');
      window.dispatchEvent(new Event('refresh-tasks'));
    },
    onError: (error: any) => {
      showError(error.message || 'Failed to delete task');
    },
  });
};
