import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetContacts, apiCreateContact, apiUpdateContact, apiDeleteContact } from '../utils/api';
import { Contact } from '../types';
import { useToast } from '../contexts/ToastContext';

// Query keys
export const contactKeys = {
  all: ['contacts'] as const,
  lists: () => [...contactKeys.all, 'list'] as const,
  list: (filters?: { search?: string; companyId?: string }) => 
    [...contactKeys.lists(), filters] as const,
  details: () => [...contactKeys.all, 'detail'] as const,
  detail: (id: string) => [...contactKeys.details(), id] as const,
};

// Get all contacts
export const useContacts = (search?: string, companyId?: string) => {
  return useQuery({
    queryKey: contactKeys.list({ search, companyId }),
    queryFn: async () => {
      const response = await apiGetContacts(search, companyId);
      return response.data || response || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - contacts change less frequently
    refetchInterval: 3 * 60 * 1000, // Refetch every 3 minutes in background
    placeholderData: (previousData) => previousData, // Smooth updates
  });
};

// Get single contact
export const useContact = (id: string) => {
  return useQuery({
    queryKey: contactKeys.detail(id),
    queryFn: async () => {
      const response = await apiGetContacts();
      const contacts = response.data || response || [];
      return contacts.find((c: Contact) => c.id === id);
    },
    enabled: !!id,
  });
};

// Create contact mutation
export const useCreateContact = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (contactData: Partial<Contact>) => {
      const response = await apiCreateContact(contactData);
      return response.data || response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
      showSuccess('Contact created successfully!');
      window.dispatchEvent(new Event('refresh-crm'));
    },
    onError: (error: any) => {
      showError(error.message || 'Failed to create contact');
    },
  });
};

// Update contact mutation
export const useUpdateContact = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Contact> }) => {
      const response = await apiUpdateContact(id, data);
      return response.data || response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
      queryClient.invalidateQueries({ queryKey: contactKeys.detail(variables.id) });
      showSuccess('Contact updated successfully!');
      window.dispatchEvent(new Event('refresh-crm'));
    },
    onError: (error: any) => {
      showError(error.message || 'Failed to update contact');
    },
  });
};

// Delete contact mutation
export const useDeleteContact = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiDeleteContact(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contactKeys.lists() });
      showSuccess('Contact deleted successfully!');
      window.dispatchEvent(new Event('refresh-crm'));
    },
    onError: (error: any) => {
      showError(error.message || 'Failed to delete contact');
    },
  });
};
