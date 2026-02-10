import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiGetPlaybookTemplates,
  apiGetPlaybookTemplate,
  apiCreatePlaybookTemplate,
  apiUpdatePlaybookTemplate,
  apiDeletePlaybookTemplate,
  apiGetPlaybookInstances,
  apiGetPlaybookInstance,
  apiCreatePlaybookInstance,
  apiUpdatePlaybookInstanceStatus,
  apiMarkPlaybookStepComplete,
  apiGetPlaybookStepCompletions
} from '../utils/api';
import { useToast } from '../contexts/ToastContext';

// Query keys - using functions to avoid circular reference issues
const baseKey = ['playbooks'] as const;

export const playbookKeys = {
  all: baseKey,
  templates: {
    all: () => [...baseKey, 'templates'] as const,
    lists: () => [...baseKey, 'templates', 'list'] as const,
    list: (filters?: { category?: string; search?: string }) =>
      [...baseKey, 'templates', 'list', filters] as const,
    details: () => [...baseKey, 'templates', 'detail'] as const,
    detail: (id: string) => [...baseKey, 'templates', 'detail', id] as const,
  },
  instances: {
    all: () => [...baseKey, 'instances'] as const,
    lists: () => [...baseKey, 'instances', 'list'] as const,
    list: (filters?: { dealId?: string; projectId?: string; companyId?: string; status?: string }) =>
      [...baseKey, 'instances', 'list', filters] as const,
    details: () => [...baseKey, 'instances', 'detail'] as const,
    detail: (id: string) => [...baseKey, 'instances', 'detail', id] as const,
    completions: (instanceId: string) => [...baseKey, 'instances', 'detail', instanceId, 'completions'] as const,
  },
};

// Template hooks
export const usePlaybookTemplates = (filters?: { category?: string; search?: string }) => {
  const queryClient = useQueryClient();

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      queryClient.invalidateQueries({ queryKey: playbookKeys.templates.lists() });
    };
    window.addEventListener('refresh-playbooks-queries', handleRefresh);
    return () => window.removeEventListener('refresh-playbooks-queries', handleRefresh);
  }, [queryClient]);

  return useQuery({
    queryKey: playbookKeys.templates.list(filters),
    queryFn: async () => {
      const response = await apiGetPlaybookTemplates(filters);
      return response.data || response || [];
    },
    staleTime: 0, // Always refetch when invalidated
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes in background
    placeholderData: (previousData) => previousData,
  });
};

export const usePlaybookTemplate = (id: string) => {
  return useQuery({
    queryKey: playbookKeys.templates.detail(id),
    queryFn: async () => {
      const response = await apiGetPlaybookTemplate(id);
      return response.data || response;
    },
    enabled: !!id,
  });
};

export const useCreatePlaybookTemplate = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (templateData: { name: string; category?: string; description?: string; sections: any[] }) => {
      const response = await apiCreatePlaybookTemplate(templateData);
      return response.data || response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: playbookKeys.templates.lists() });
      queryClient.refetchQueries({ queryKey: playbookKeys.templates.lists() });
      showSuccess('Playbook template created successfully!');
      window.dispatchEvent(new Event('refresh-playbooks-queries'));
    },
    onError: (error: any) => {
      showError(error.message || 'Failed to create playbook template');
    },
  });
};

export const useUpdatePlaybookTemplate = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; category?: string; description?: string; sections?: any[] } }) => {
      const response = await apiUpdatePlaybookTemplate(id, data);
      return response.data || response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: playbookKeys.templates.lists() });
      queryClient.invalidateQueries({ queryKey: playbookKeys.templates.detail(variables.id) });
      queryClient.refetchQueries({ queryKey: playbookKeys.templates.lists() });
      showSuccess('Playbook template updated successfully!');
      window.dispatchEvent(new Event('refresh-playbooks-queries'));
    },
    onError: (error: any) => {
      showError(error.message || 'Failed to update playbook template');
    },
  });
};

export const useDeletePlaybookTemplate = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiDeletePlaybookTemplate(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: playbookKeys.templates.lists() });
      showSuccess('Playbook template deleted successfully!');
      window.dispatchEvent(new Event('refresh-playbooks'));
    },
    onError: (error: any) => {
      showError(error.message || 'Failed to delete playbook template');
    },
  });
};

// Instance hooks
export const usePlaybookInstances = (filters?: { dealId?: string; projectId?: string; companyId?: string; status?: string }) => {
  return useQuery({
    queryKey: playbookKeys.instances.list(filters),
    queryFn: async () => {
      const response = await apiGetPlaybookInstances(filters);
      return response.data || response || [];
    },
    staleTime: 0, // Always refetch when invalidated
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes in background
    placeholderData: (previousData) => previousData,
  });
};

export const usePlaybookInstance = (id: string) => {
  return useQuery({
    queryKey: playbookKeys.instances.detail(id),
    queryFn: async () => {
      const response = await apiGetPlaybookInstance(id);
      return response.data || response;
    },
    enabled: !!id,
  });
};

export const useCreatePlaybookInstance = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (instanceData: { templateId: string; dealId?: string; projectId?: string }) => {
      const response = await apiCreatePlaybookInstance(instanceData);
      return response.data || response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: playbookKeys.instances.lists() });
      queryClient.refetchQueries({ queryKey: playbookKeys.instances.lists() });
      showSuccess('Playbook instance created successfully!');
      window.dispatchEvent(new Event('refresh-playbooks-queries'));
    },
    onError: (error: any) => {
      showError(error.message || 'Failed to create playbook instance');
    },
  });
};

export const useUpdatePlaybookInstanceStatus = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'completed' }) => {
      const response = await apiUpdatePlaybookInstanceStatus(id, status);
      return response.data || response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: playbookKeys.instances.lists() });
      queryClient.invalidateQueries({ queryKey: playbookKeys.instances.detail(variables.id) });
      showSuccess('Playbook instance status updated successfully!');
      window.dispatchEvent(new Event('refresh-playbooks'));
    },
    onError: (error: any) => {
      showError(error.message || 'Failed to update playbook instance status');
    },
  });
};

export const useMarkPlaybookStepComplete = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async ({ instanceId, stepId }: { instanceId: string; stepId: string }) => {
      const response = await apiMarkPlaybookStepComplete(instanceId, stepId);
      return response.data || response;
    },
    onMutate: async ({ instanceId, stepId }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: playbookKeys.instances.completions(instanceId) });
      
      // Snapshot the previous value for rollback
      const previousCompletions = queryClient.getQueryData(playbookKeys.instances.completions(instanceId));
      
      // Optimistically update the completions cache
      queryClient.setQueryData(playbookKeys.instances.completions(instanceId), (old: any[] = []) => {
        // Check if step is already completed
        if (old.some((c: any) => c.stepId === stepId)) {
          return old;
        }
        // Add the new completion optimistically
        const currentUser = JSON.parse(localStorage.getItem('user_data') || '{}');
        return [...old, {
          id: `temp-${Date.now()}`,
          instanceId,
          stepId,
          completedBy: currentUser.id,
          completedAt: new Date().toISOString()
        }];
      });
      
      return { previousCompletions };
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch completions immediately (needed for current view)
      queryClient.invalidateQueries({ queryKey: playbookKeys.instances.completions(variables.instanceId) });
      // Invalidate instance detail (will refetch when needed)
      queryClient.invalidateQueries({ queryKey: playbookKeys.instances.detail(variables.instanceId) });
      // Invalidate lists (will refetch when list views are accessed)
      queryClient.invalidateQueries({ queryKey: playbookKeys.instances.lists() });
      
      showSuccess('Step marked as complete!');
      window.dispatchEvent(new Event('refresh-playbooks-queries'));
    },
    onError: (error: any, variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousCompletions) {
        queryClient.setQueryData(
          playbookKeys.instances.completions(variables.instanceId),
          context.previousCompletions
        );
      }
      showError(error.message || 'Failed to mark step as complete');
    },
  });
};

export const usePlaybookStepCompletions = (instanceId: string) => {
  const queryClient = useQueryClient();

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      queryClient.invalidateQueries({ queryKey: playbookKeys.instances.completions(instanceId) });
    };
    window.addEventListener('refresh-playbooks-queries', handleRefresh);
    return () => window.removeEventListener('refresh-playbooks-queries', handleRefresh);
  }, [instanceId, queryClient]);

  return useQuery({
    queryKey: playbookKeys.instances.completions(instanceId),
    queryFn: async () => {
      const response = await apiGetPlaybookStepCompletions(instanceId);
      return response.data || response || [];
    },
    enabled: !!instanceId,
    staleTime: 0, // Always refetch when invalidated
    refetchOnWindowFocus: false, // Don't refetch on window focus to improve performance
  });
};
