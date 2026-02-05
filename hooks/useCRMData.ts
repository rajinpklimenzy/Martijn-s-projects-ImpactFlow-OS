import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  apiGetCompanies, 
  apiGetContacts, 
  apiGetDeals, 
  apiGetUsers,
  apiUpdateCompany,
  apiUpdateContact,
  apiDeleteCompany,
  apiDeleteContact
} from '../utils/api';
import { Company, Contact, Deal, User } from '../types';

// Query keys for cache management
export const CRM_QUERY_KEYS = {
  companies: (search?: string) => ['companies', search] as const,
  contacts: (search?: string) => ['contacts', search] as const,
  deals: () => ['deals'] as const,
  users: () => ['users'] as const,
};

/**
 * Hook to fetch companies with caching
 */
export const useCompanies = (searchQuery?: string) => {
  return useQuery({
    queryKey: CRM_QUERY_KEYS.companies(searchQuery),
    queryFn: async () => {
      const response = await apiGetCompanies(searchQuery?.trim() || undefined);
      return response.data || [];
    },
    staleTime: 10 * 1000, // 10 seconds - data is fresh
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: true, // Refetch on component mount if stale
    refetchInterval: 30 * 1000, // Poll every 30 seconds for updates
  });
};

/**
 * Hook to fetch contacts with caching
 */
export const useContacts = (searchQuery?: string) => {
  return useQuery({
    queryKey: CRM_QUERY_KEYS.contacts(searchQuery),
    queryFn: async () => {
      const response = await apiGetContacts(searchQuery?.trim() || undefined);
      return response.data || [];
    },
    staleTime: 10 * 1000, // 10 seconds - data is fresh
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: true, // Refetch on component mount if stale
    refetchInterval: 30 * 1000, // Poll every 30 seconds for updates
  });
};

/**
 * Hook to fetch deals with caching
 */
export const useDeals = () => {
  return useQuery({
    queryKey: CRM_QUERY_KEYS.deals(),
    queryFn: async () => {
      const response = await apiGetDeals();
      return response.data || [];
    },
    staleTime: 60 * 1000, // 1 minute - deals change less frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Hook to fetch users with caching
 */
export const useUsers = () => {
  return useQuery({
    queryKey: CRM_QUERY_KEYS.users(),
    queryFn: async () => {
      const response = await apiGetUsers();
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - users rarely change
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

/**
 * Hook to update a company with optimistic updates
 */
export const useUpdateCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Company> }) => {
      await apiUpdateCompany(id, updates);
      return { id, updates };
    },
    // Optimistic update - update cache immediately
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['companies'] });

      // Snapshot previous values
      const previousCompanies = queryClient.getQueriesData({ queryKey: ['companies'] });

      // Optimistically update all company queries
      queryClient.setQueriesData<Company[]>(
        { queryKey: ['companies'] },
        (old) => old?.map(c => c.id === id ? { ...c, ...updates } : c)
      );

      return { previousCompanies };
    },
    // Rollback on error
    onError: (err, variables, context) => {
      if (context?.previousCompanies) {
        context.previousCompanies.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    // Refetch after success to ensure consistency
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
};

/**
 * Hook to update a contact with optimistic updates
 */
export const useUpdateContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Contact> }) => {
      await apiUpdateContact(id, updates);
      return { id, updates };
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['contacts'] });
      const previousContacts = queryClient.getQueriesData({ queryKey: ['contacts'] });

      queryClient.setQueriesData<Contact[]>(
        { queryKey: ['contacts'] },
        (old) => old?.map(c => c.id === id ? { ...c, ...updates } : c)
      );

      return { previousContacts };
    },
    onError: (err, variables, context) => {
      if (context?.previousContacts) {
        context.previousContacts.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
};

/**
 * Hook to delete a company - waits for server confirmation
 */
export const useDeleteCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiDeleteCompany(id);
      return id;
    },
    // Remove optimistic update - wait for server confirmation
    onSuccess: (deletedId) => {
      // Update cache after successful deletion
      queryClient.setQueriesData<Company[]>(
        { queryKey: ['companies'] },
        (old) => old?.filter(c => c.id !== deletedId)
      );
    },
  });
};

/**
 * Hook to delete a contact - waits for server confirmation
 */
export const useDeleteContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiDeleteContact(id);
      return id;
    },
    // Remove optimistic update - wait for server confirmation
    onSuccess: (deletedId) => {
      // Update cache after successful deletion
      queryClient.setQueriesData<Contact[]>(
        { queryKey: ['contacts'] },
        (old) => old?.filter(c => c.id !== deletedId)
      );
    },
  });
};

/**
 * Hook to delete multiple companies - waits for server confirmation
 */
export const useBulkDeleteCompanies = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiDeleteCompany(id)));
      return ids;
    },
    // Remove optimistic update - wait for server confirmation
    onSuccess: (deletedIds) => {
      // Update cache after successful deletion
      queryClient.setQueriesData<Company[]>(
        { queryKey: ['companies'] },
        (old) => old?.filter(c => !deletedIds.includes(c.id))
      );
    },
  });
};

/**
 * Hook to delete multiple contacts - waits for server confirmation
 */
export const useBulkDeleteContacts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiDeleteContact(id)));
      return ids;
    },
    // Remove optimistic update - wait for server confirmation
    onSuccess: (deletedIds) => {
      // Update cache after successful deletion
      queryClient.setQueriesData<Contact[]>(
        { queryKey: ['contacts'] },
        (old) => old?.filter(c => !deletedIds.includes(c.id))
      );
    },
  });
};

/**
 * Hook to bulk update companies - waits for server confirmation
 */
export const useBulkUpdateCompanies = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<Company> }) => {
      await Promise.all(ids.map(id => apiUpdateCompany(id, updates)));
      return { ids, updates };
    },
    // Remove optimistic update - wait for server confirmation
    onSuccess: ({ ids, updates }) => {
      // Update cache after successful update
      queryClient.setQueriesData<Company[]>(
        { queryKey: ['companies'] },
        (old) => old?.map(c => ids.includes(c.id) ? { ...c, ...updates } : c)
      );
    },
  });
};
