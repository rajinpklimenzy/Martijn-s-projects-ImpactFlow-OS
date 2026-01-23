import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a client with background refetching and smooth updates
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds - data is fresh for 30 seconds, then refetch in background
      gcTime: 5 * 60 * 1000, // 5 minutes - keep cached data for 5 minutes
      refetchOnWindowFocus: true, // Refetch in background when window regains focus
      refetchOnReconnect: true, // Refetch in background when network reconnects
      refetchOnMount: true, // Refetch in background if data is stale
      refetchInterval: 60 * 1000, // Refetch every 60 seconds in background
      retry: 1, // Retry failed requests once
      // Keep showing cached data while refetching in background
      placeholderData: (previousData) => previousData,
    },
    mutations: {
      retry: 1, // Retry failed mutations once
    },
  },
});

interface QueryProviderProps {
  children: React.ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

export { queryClient };
