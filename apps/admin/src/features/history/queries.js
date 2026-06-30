/**
 * features/history/queries.js
 * TanStack Query hooks yang membungkus api.js.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchHistory, deleteHistoryEntry } from "./api";

export const historyKeys = {
  all: ["history"],
  list: (dateFrom, dateTo, category) => ["history", dateFrom, dateTo, category],
};

export function useHistoryQuery({ dateFrom = null, dateTo = null, category = "all" } = {}) {
  return useQuery({
    queryKey: historyKeys.list(dateFrom, dateTo, category),
    queryFn: () => fetchHistory({ dateFrom, dateTo, category }),
  });
}

export function useDeleteHistoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteHistoryEntry(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: historyKeys.all }),
  });
}
