import {
  useCreatePengirimanMutation,
  useDeletePengirimanMutation,
  usePengirimanQuery,
  useUpdatePengirimanMutation,
} from "./queries";
import type { PengirimanFormPayload } from "./schema";

export function usePengiriman(dateFrom: string | null = null, dateTo: string | null = null) {
  const { data, isLoading, error, refetch } = usePengirimanQuery(dateFrom, dateTo);
  return { pengirimanList: data ?? [], loading: isLoading, error, reload: refetch };
}

export function useCreatePengiriman() {
  const { mutateAsync } = useCreatePengirimanMutation();
  return (payload: PengirimanFormPayload) => mutateAsync(payload);
}

export function useUpdatePengiriman() {
  const { mutateAsync } = useUpdatePengirimanMutation();
  return (pengiriman: { id: string }, payload: PengirimanFormPayload) =>
    mutateAsync({ pengiriman, payload });
}

export function useDeletePengiriman() {
  const { mutateAsync } = useDeletePengirimanMutation();
  return (pengiriman: { id: string }) => mutateAsync(pengiriman);
}
