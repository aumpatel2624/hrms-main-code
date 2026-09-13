import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 2,
        },
    },
});

// Entity configs load dropdowns outside React components. Using fetchQuery here
// keeps those existing loaders intact while still giving them deduplication and
// the same cache lifetime as useQuery calls.
export const cachedQuery = (queryKey, queryFn) =>
    queryClient.fetchQuery({ queryKey, queryFn });

export const invalidateQuery = (queryKey) =>
    queryClient.invalidateQueries({ queryKey });
