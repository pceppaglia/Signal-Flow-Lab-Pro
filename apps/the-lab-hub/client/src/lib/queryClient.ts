import { QueryClient } from "@tanstack/react-query";

/**
 * Global QueryClient instance for React Query
 * Configured with standard defaults for the Lab hub
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevents audio engine state from flickering on tab switch
      retry: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
    mutations: {
      retry: false,
    },
  },
});