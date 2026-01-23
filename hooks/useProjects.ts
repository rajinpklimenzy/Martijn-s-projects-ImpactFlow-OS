import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetProjects, apiCreateProject, apiUpdateProject, apiDeleteProject } from '../utils/api';
import { Project } from '../types';
import { useToast } from '../contexts/ToastContext';

// Query keys
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters?: { userId?: string; companyId?: string; status?: string }) => 
    [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

// Get all projects
export const useProjects = (userId?: string, companyId?: string, status?: string) => {
  return useQuery({
    queryKey: projectKeys.list({ userId, companyId, status }),
    queryFn: async () => {
      const response = await apiGetProjects(userId, companyId, status);
      return response.data || response || [];
    },
    enabled: !!userId, // Only fetch if userId is provided
    staleTime: 1 * 60 * 1000, // 1 minute - projects update moderately
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes in background
    placeholderData: (previousData) => previousData, // Smooth updates
  });
};

// Get single project
export const useProject = (id: string) => {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async () => {
      const response = await apiGetProjects();
      const projects = response.data || response || [];
      return projects.find((p: Project) => p.id === id);
    },
    enabled: !!id,
  });
};

// Create project mutation
export const useCreateProject = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (projectData: Partial<Project>) => {
      const response = await apiCreateProject(projectData);
      return response.data || response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      showSuccess('Project created successfully!');
      window.dispatchEvent(new Event('refresh-projects'));
    },
    onError: (error: any) => {
      showError(error.message || 'Failed to create project');
    },
  });
};

// Update project mutation
export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Project> }) => {
      const response = await apiUpdateProject(id, data);
      return response.data || response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) });
      showSuccess('Project updated successfully!');
      window.dispatchEvent(new Event('refresh-projects'));
    },
    onError: (error: any) => {
      showError(error.message || 'Failed to update project');
    },
  });
};

// Delete project mutation
export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiDeleteProject(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      // Also invalidate tasks since project deletion cascades
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] });
      showSuccess('Project and associated tasks deleted successfully!');
      window.dispatchEvent(new Event('refresh-projects'));
      window.dispatchEvent(new Event('refresh-tasks'));
    },
    onError: (error: any) => {
      showError(error.message || 'Failed to delete project');
    },
  });
};
