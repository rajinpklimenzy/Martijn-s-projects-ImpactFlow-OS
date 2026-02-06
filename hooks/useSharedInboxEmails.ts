import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetSharedInboxEmails, apiGetSharedInboxSenders, apiSyncSharedInbox } from '../utils/api';
import type { SharedInboxFilters } from '../utils/api';

// Query keys
export const sharedInboxKeys = {
  all: ['shared-inbox'] as const,
  emails: () => [...sharedInboxKeys.all, 'emails'] as const,
  emailsList: (userId: string, filters?: SharedInboxFilters) => 
    [...sharedInboxKeys.emails(), userId, filters] as const,
  senders: (userId: string, limit?: number) => 
    [...sharedInboxKeys.all, 'senders', userId, limit] as const,
};

// Get shared inbox emails with infinite scroll support
export const useSharedInboxEmails = (
  userId: string | undefined,
  filters?: SharedInboxFilters,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    refetchInterval?: number;
  }
) => {
  const PAGE_SIZE = filters?.limit || 50;

  return useInfiniteQuery({
    queryKey: sharedInboxKeys.emailsList(userId || '', filters),
    queryFn: async ({ pageParam = 0 }) => {
      if (!userId) return { data: [], hasMore: false, total: 0, page: 0 };
      
      const queryFilters: SharedInboxFilters = {
        ...filters,
        page: pageParam,
        limit: PAGE_SIZE,
      };
      
      const response = await apiGetSharedInboxEmails(userId, queryFilters);
      const data = response?.data ?? response ?? [];
      const emailsArray = Array.isArray(data) ? data : [];
      
      return {
        data: emailsArray,
        hasMore: response?.hasMore ?? (emailsArray.length === PAGE_SIZE),
        total: response?.total ?? emailsArray.length,
        page: pageParam,
      };
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.length; // Next page number
    },
    initialPageParam: 0,
    enabled: !!userId && (options?.enabled !== false),
    staleTime: options?.staleTime ?? 30 * 1000, // 30 seconds - refetch in background after 30 seconds
    refetchInterval: options?.refetchInterval ?? 60 * 1000, // Refetch every 60 seconds in background
    // Keep showing cached data while refetching in background for smooth updates
    placeholderData: (previousData) => previousData,
  });
};

// Get senders for autocomplete
export const useSharedInboxSenders = (userId: string | undefined, limit?: number) => {
  return useQuery({
    queryKey: sharedInboxKeys.senders(userId || '', limit),
    queryFn: async () => {
      if (!userId) return [];
      const response = await apiGetSharedInboxSenders(userId, limit);
      return response?.data ?? response ?? [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes - senders don't change often
  });
};

// Sync emails mutation
export const useSyncSharedInbox = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, accountEmail, scopeHours, scopeDays }: { userId: string; accountEmail?: string; scopeHours?: number; scopeDays?: number }) => {
      const response = await apiSyncSharedInbox(userId, accountEmail, scopeHours, scopeDays);
      return response;
    },
    onSuccess: () => {
      // Invalidate all email queries to refetch after sync
      queryClient.invalidateQueries({ queryKey: sharedInboxKeys.emails() });
    },
  });
};
