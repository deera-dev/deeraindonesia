import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteHistoryEntry, fetchHistory, fetchHistoryByKode } from "./api";
import type { HistoryFilter } from "./schema";

export const historyKeys = {
  all: ["history"],
  list: (dateFrom: string | null, dateTo: string | null, category: string) => [
    "history",
    dateFrom,
    dateTo,
    category,
  ],
  byKode: (kode: string | null | undefined) => ["history", "byKode", kode],
};

export function useHistoryQuery({
  dateFrom = null,
  dateTo = null,
  category = "all",
}: HistoryFilter = {}) {
  return useQuery({
    queryKey: historyKeys.list(dateFrom, dateTo, category),
    queryFn: () => fetchHistory({ dateFrom, dateTo, category }),
  });
}

export function useHistoryByKodeQuery(kode: string | null | undefined) {
  return useQuery({
    queryKey: historyKeys.byKode(kode),
    queryFn: () => fetchHistoryByKode(kode),
    enabled: !!kode,
  });
}

export function useDeleteHistoryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteHistoryEntry(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: historyKeys.all }),
  });
}
