import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetCompanies, apiCreateCompany, apiUpdateCompany, apiDeleteCompany, apiSearchCompanies } from '../utils/api';
import { Company } from '../types';
import { useToast } from '../contexts/ToastContext';

// Query keys
export const companyKeys = {
  all: ['companies'] as const,
  lists: () => [...companyKeys.all, 'list'] as const,
  list: (search?: string) => [...companyKeys.lists(), { search }] as const,
  details: () => [...companyKeys.all, 'detail'] as const,
  detail: (id: string) => [...companyKeys.details(), id] as const,
};

// Get all companies
export const useCompanies = (search?: string) => {
  return useQuery({
    queryKey: companyKeys.list(search),
    queryFn: async () => {
      const response = await apiGetCompanies(search);
      return response.data || response || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - companies change less frequently
    refetchInterval: 3 * 60 * 1000, // Refetch every 3 minutes in background
    placeholderData: (previousData) => previousData, // Smooth updates
  });
};

// Get single company
export const useCompany = (id: string) => {
  return useQuery({
    queryKey: companyKeys.detail(id),
    queryFn: async () => {
      const response = await apiGetCompanies();
      const companies = response.data || response || [];
      return companies.find((c: Company) => c.id === id);
    },
    enabled: !!id,
  });
};

// Create company mutation
export const useCreateCompany = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (companyData: Partial<Company>) => {
      const response = await apiCreateCompany(companyData);
      return response.data || response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
      showSuccess('Company created successfully!');
      window.dispatchEvent(new Event('refresh-crm'));
    },
    onError: (error: any) => {
      showError(error.message || 'Failed to create company');
    },
  });
};

// Update company mutation
export const useUpdateCompany = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Company> }) => {
      const response = await apiUpdateCompany(id, data);
      return response.data || response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: companyKeys.detail(variables.id) });
      showSuccess('Company updated successfully!');
      window.dispatchEvent(new Event('refresh-crm'));
    },
    onError: (error: any) => {
      showError(error.message || 'Failed to update company');
    },
  });
};

// Delete company mutation
export const useDeleteCompany = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiDeleteCompany(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
      showSuccess('Company deleted successfully!');
      window.dispatchEvent(new Event('refresh-crm'));
    },
    onError: (error: any) => {
      showError(error.message || 'Failed to delete company');
    },
  });
};
