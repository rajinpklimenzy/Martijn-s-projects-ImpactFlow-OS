import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetDeals, apiCreateDeal, apiUpdateDeal, apiDeleteDeal } from '../utils/api';
import { Deal } from '../types';
import { useToast } from '../contexts/ToastContext';

// Query keys
export const dealKeys = {
  all: ['deals'] as const,
  lists: () => [...dealKeys.all, 'list'] as const,
  list: (filters?: { userId?: string; stage?: string; companyId?: string }) => 
    [...dealKeys.lists(), filters] as const,
  details: () => [...dealKeys.all, 'detail'] as const,
  detail: (id: string) => [...dealKeys.details(), id] as const,
};

// Get all deals
export const useDeals = (userId?: string, stage?: string, companyId?: string) => {
  return useQuery({
    queryKey: dealKeys.list({ userId, stage, companyId }),
    queryFn: async () => {
      const response = await apiGetDeals(userId, stage, companyId);
      return response.data || response || [];
    },
    enabled: !!userId, // Only fetch if userId is provided
    staleTime: 1 * 60 * 1000, // 1 minute - deals update moderately
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes in background
    placeholderData: (previousData) => previousData, // Smooth updates
  });
};

// Get single deal
export const useDeal = (id: string) => {
  return useQuery({
    queryKey: dealKeys.detail(id),
    queryFn: async () => {
      const response = await apiGetDeals();
      const deals = response.data || response || [];
      return deals.find((d: Deal) => d.id === id);
    },
    enabled: !!id,
  });
};

// Create deal mutation
export const useCreateDeal = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (dealData: Partial<Deal>) => {
      const response = await apiCreateDeal(dealData);
      return response.data || response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealKeys.lists() });
      showSuccess('Deal created successfully!');
      window.dispatchEvent(new Event('refresh-pipeline'));
    },
    onError: (error: any) => {
      showError(error.message || 'Failed to create deal');
    },
  });
};

// Update deal mutation
export const useUpdateDeal = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Deal> }) => {
      const response = await apiUpdateDeal(id, data);
      return response.data || response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: dealKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dealKeys.detail(variables.id) });
      showSuccess('Deal updated successfully!');
      window.dispatchEvent(new Event('refresh-pipeline'));
    },
    onError: (error: any) => {
      showError(error.message || 'Failed to update deal');
    },
  });
};

// Delete deal mutation
export const useDeleteDeal = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiDeleteDeal(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealKeys.lists() });
      showSuccess('Deal deleted successfully!');
      window.dispatchEvent(new Event('refresh-pipeline'));
    },
    onError: (error: any) => {
      showError(error.message || 'Failed to delete deal');
    },
  });
};
