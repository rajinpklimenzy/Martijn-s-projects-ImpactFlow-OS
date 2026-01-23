import { useQuery } from '@tanstack/react-query';
import { apiGetUsers } from '../utils/api';

// Query keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (search?: string) => [...userKeys.lists(), { search }] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

// Get all users
export const useUsers = (search?: string) => {
  return useQuery({
    queryKey: userKeys.list(search),
    queryFn: async () => {
      const response = await apiGetUsers(undefined, search);
      return response.data || response || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - users change rarely
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes in background
    placeholderData: (previousData) => previousData, // Smooth updates
  });
};
