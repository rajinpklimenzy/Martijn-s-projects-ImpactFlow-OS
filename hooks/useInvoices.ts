import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetInvoices, apiCreateInvoice, apiUpdateInvoice, apiDeleteInvoice, apiSendInvoiceEmail } from '../utils/api';
import { Invoice } from '../types';
import { useToast } from '../contexts/ToastContext';

// Query keys
export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (filters?: { userId?: string; companyId?: string; status?: string }) => 
    [...invoiceKeys.lists(), filters] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (id: string) => [...invoiceKeys.details(), id] as const,
};

// Get all invoices
export const useInvoices = (userId?: string, companyId?: string, status?: string) => {
  return useQuery({
    queryKey: invoiceKeys.list({ userId, companyId, status }),
    queryFn: async () => {
      const response = await apiGetInvoices(userId, companyId, status);
      return response.data || response || [];
    },
    enabled: !!userId, // Only fetch if userId is provided
    staleTime: 1 * 60 * 1000, // 1 minute - invoices update moderately
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes in background
    placeholderData: (previousData) => previousData, // Smooth updates
  });
};

// Get single invoice
export const useInvoice = (id: string) => {
  return useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: async () => {
      const response = await apiGetInvoices();
      const invoices = response.data || response || [];
      return invoices.find((inv: Invoice) => inv.id === id);
    },
    enabled: !!id,
  });
};

// Create invoice mutation
export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (invoiceData: Partial<Invoice>) => {
      const response = await apiCreateInvoice(invoiceData);
      return response.data || response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      showSuccess('Invoice created successfully!');
      window.dispatchEvent(new Event('refresh-invoices'));
    },
    onError: (error: any) => {
      showError(error.message || 'Failed to create invoice');
    },
  });
};

// Update invoice mutation
export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Invoice> }) => {
      const response = await apiUpdateInvoice(id, data);
      return response.data || response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables.id) });
      showSuccess('Invoice updated successfully!');
      window.dispatchEvent(new Event('refresh-invoices'));
    },
    onError: (error: any) => {
      showError(error.message || 'Failed to update invoice');
    },
  });
};

// Delete invoice mutation
export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiDeleteInvoice(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      showSuccess('Invoice deleted successfully!');
      window.dispatchEvent(new Event('refresh-invoices'));
    },
    onError: (error: any) => {
      showError(error.message || 'Failed to delete invoice');
    },
  });
};

// Send invoice email mutation
export const useSendInvoiceEmail = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiSendInvoiceEmail(id);
      return response;
    },
    onSuccess: (_, invoiceId) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(invoiceId) });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      showSuccess('Invoice email sent successfully!');
    },
    onError: (error: any) => {
      showError(error.message || 'Failed to send invoice email');
    },
  });
};
