/**
 * test/helpers/queryClient.js — Factory QueryClient khusus test (retry
 * dimatikan, no cache time) dipakai semua test `queries.js` (TanStack Query)
 * di seluruh monorepo.
 */
import { QueryClient } from "@tanstack/react-query";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}
