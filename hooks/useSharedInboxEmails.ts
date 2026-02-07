import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGetSharedInboxEmails, apiGetSharedInboxSenders, apiSyncSharedInbox } from '../utils/api';
import type { SharedInboxFilters } from '../utils/api';

// Stable serialization for filters so query key doesn't change when object reference changes
function stableFilterKey(filters: SharedInboxFilters | undefined): string {
  if (filters == null || Object.keys(filters).length === 0) return '';
  const sorted = Object.keys(filters).sort().reduce<Record<string, unknown>>((acc, k) => {
    acc[k] = (filters as Record<string, unknown>)[k];
    return acc;
  }, {});
  return JSON.stringify(sorted);
}

// Query keys
export const sharedInboxKeys = {
  all: ['shared-inbox'] as const,
  emails: () => [...sharedInboxKeys.all, 'emails'] as const,
  emailsList: (userId: string, filters?: SharedInboxFilters) =>
    [...sharedInboxKeys.emails(), userId, stableFilterKey(filters)] as const,
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
    queryFn: async ({ pageParam }) => {
      if (!userId) return { data: [], hasMore: false, total: 0, nextCursor: undefined };
      const queryFilters: SharedInboxFilters = {
        ...filters,
        limit: PAGE_SIZE,
      };
      if (typeof pageParam === 'string') {
        queryFilters.cursor = pageParam;
      } else if (pageParam != null && pageParam !== undefined) {
        queryFilters.page = Number(pageParam);
      } else {
        queryFilters.page = 0;
      }
      const response = await apiGetSharedInboxEmails(userId, queryFilters);
      const data = response?.data ?? response ?? [];
      const emailsArray = Array.isArray(data) ? data : [];
      const serverHasMore = response?.hasMore;
      const hasMore = typeof serverHasMore === 'boolean'
        ? serverHasMore
        : emailsArray.length >= PAGE_SIZE;
      return {
        data: emailsArray,
        hasMore,
        total: response?.total ?? emailsArray.length,
        nextCursor: response?.nextCursor,
      };
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      if (lastPage.nextCursor) return lastPage.nextCursor;
      return allPages.length;
    },
    initialPageParam: undefined as string | number | undefined,
    enabled: !!userId && (options?.enabled !== false),
    staleTime: options?.staleTime ?? 60 * 1000, // 1 min – use cache, refetch in background
    refetchInterval: options?.refetchInterval ?? 2 * 60 * 1000, // 2 min – avoid blocking UI with frequent refetches
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Avoid duplicate fetch on remount (e.g. Strict Mode); invalidateQueries/refetch still work
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
    mutationFn: async ({ userId, accountEmail, scopeHours, scopeDays }: { userId: string; accountEmail?: string; scopeHours?: number; scopeDays?: number | 'all' }) => {
      const response = await apiSyncSharedInbox(userId, accountEmail, scopeHours, scopeDays);
      return response;
    },
    onSuccess: () => {
      // Invalidate all email queries to refetch after sync
      queryClient.invalidateQueries({ queryKey: sharedInboxKeys.emails() });
    },
  });
};
