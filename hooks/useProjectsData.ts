import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  apiGetProjects, 
  apiGetCompanies, 
  apiGetUsers, 
  apiGetTasks, 
  apiUpdateProject, 
  apiDeleteProject,
  apiGetActivityFeed
} from '../utils/api';
import { Project, Company, User, Task } from '../types';
import { useToast } from '../contexts/ToastContext';

// Query keys for cache management
export const PROJECTS_QUERY_KEYS = {
  projects: (userId: string) => ['projects', userId] as const,
  companies: ['companies'] as const,
  users: ['users'] as const,
  tasks: (userId: string) => ['tasks', userId] as const,
  projectActivities: (projectId: string) => ['project-activities', projectId] as const,
};

// Hook to fetch projects
export const useProjects = (userId: string | undefined) => {
  return useQuery({
    queryKey: PROJECTS_QUERY_KEYS.projects(userId || ''),
    queryFn: async () => {
      if (!userId) return [];
      const response = await apiGetProjects(userId);
      return response.data || [];
    },
    enabled: !!userId,
    staleTime: 0, // Always consider stale for fresh data
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 30000, // Auto-refetch every 30 seconds
  });
};

// Hook to fetch companies
export const useCompanies = () => {
  return useQuery({
    queryKey: PROJECTS_QUERY_KEYS.companies,
    queryFn: async () => {
      const response = await apiGetCompanies();
      return response.data || [];
    },
    staleTime: 60000, // Cache for 1 minute
    refetchOnWindowFocus: false,
  });
};

// Hook to fetch users
export const useUsers = () => {
  return useQuery({
    queryKey: PROJECTS_QUERY_KEYS.users,
    queryFn: async () => {
      const response = await apiGetUsers();
      return response.data || [];
    },
    staleTime: 60000, // Cache for 1 minute
    refetchOnWindowFocus: false,
  });
};

// Hook to fetch tasks
export const useTasks = (userId: string | undefined) => {
  return useQuery({
    queryKey: PROJECTS_QUERY_KEYS.tasks(userId || ''),
    queryFn: async () => {
      if (!userId) return [];
      const response = await apiGetTasks(userId);
      return response.data || [];
    },
    enabled: !!userId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 30000,
  });
};

// Hook to fetch project activities
export const useProjectActivities = (projectId: string | null) => {
  return useQuery({
    queryKey: PROJECTS_QUERY_KEYS.projectActivities(projectId || ''),
    queryFn: async () => {
      if (!projectId) return [];
      const response = await apiGetActivityFeed('project', projectId);
      return response?.data || [];
    },
    enabled: !!projectId,
    staleTime: 10000, // Cache for 10 seconds
    refetchOnWindowFocus: true,
  });
};

// Hook to update project
export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Project> }) => {
      return await apiUpdateProject(id, data);
    },
    onSuccess: (_, variables) => {
      showSuccess('Project updated successfully');
      
      // Invalidate and refetch all related queries
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ 
        queryKey: PROJECTS_QUERY_KEYS.projectActivities(variables.id) 
      });
    },
    onError: (error: any) => {
      console.error('Failed to update project:', error);
      showError(error?.message || 'Failed to update project');
    },
  });
};

// Hook to delete project
export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      return await apiDeleteProject(id);
    },
    onSuccess: () => {
      showSuccess('Project deleted successfully');
      
      // Invalidate all project-related queries after successful delete
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error: any) => {
      console.error('Failed to delete project:', error);
      showError(error?.message || 'Failed to delete project');
    },
  });
};

// Hook to archive/unarchive project
export const useArchiveProject = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async ({ id, isArchived }: { id: string; isArchived: boolean }) => {
      return await apiUpdateProject(id, { isArchived });
    },
    onSuccess: (_, variables) => {
      showSuccess(
        variables.isArchived ? 'Project archived successfully' : 'Project restored successfully'
      );
      
      // Invalidate queries after successful archive/restore
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ 
        queryKey: PROJECTS_QUERY_KEYS.projectActivities(variables.id) 
      });
    },
    onError: (error: any) => {
      console.error('Failed to archive/restore project:', error);
      showError(error?.message || 'Failed to update project');
    },
  });
};

// Hook to bulk delete projects
export const useBulkDeleteProjects = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      // Delete projects in parallel
      await Promise.all(ids.map(id => apiDeleteProject(id)));
    },
    onSuccess: (_, ids) => {
      showSuccess(`${ids.length} project(s) deleted successfully`);
      
      // Invalidate queries after successful bulk delete
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error: any) => {
      console.error('Failed to bulk delete projects:', error);
      showError(error?.message || 'Failed to delete projects');
    },
  });
};
