import { useDeleteHistoryMutation, useHistoryByKodeQuery, useHistoryQuery } from "./queries";

export { logHistory } from "./api";

export function useHistory({ dateFrom = null, dateTo = null, category = "all" } = {}) {
  const { data, isLoading, error, refetch } = useHistoryQuery({ dateFrom, dateTo, category });
  return { history: data ?? [], loading: isLoading, error, reload: refetch };
}

export function useHistoryByKode(kode) {
  const { data, isLoading } = useHistoryByKodeQuery(kode);
  return { history: data ?? [], loading: isLoading };
}

export function useDeleteHistory() {
  const { mutateAsync } = useDeleteHistoryMutation();
  return (id) => mutateAsync(id);
}
