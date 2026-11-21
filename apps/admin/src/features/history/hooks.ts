import { useDeleteHistoryMutation, useHistoryByKodeQuery, useHistoryQuery } from "./queries";
import type { HistoryFilter } from "./schema";

export { logHistory } from "./api";

export function useHistory({
  dateFrom = null,
  dateTo = null,
  category = "all",
}: HistoryFilter = {}) {
  const { data, isLoading, error, refetch } = useHistoryQuery({ dateFrom, dateTo, category });
  return { history: data ?? [], loading: isLoading, error, reload: refetch };
}

export function useHistoryByKode(kode: string | null | undefined) {
  const { data, isLoading } = useHistoryByKodeQuery(kode);
  return { history: data ?? [], loading: isLoading };
}

export function useDeleteHistory() {
  const { mutateAsync } = useDeleteHistoryMutation();
  return (id: string) => mutateAsync(id);
}
