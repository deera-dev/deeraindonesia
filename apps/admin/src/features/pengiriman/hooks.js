/**
 * features/pengiriman/hooks.js — PUBLIC SURFACE fitur pengiriman.
 * Komponen HANYA boleh import dari sini (atau ./index.js).
 */
import {
  usePengirimanQuery,
  useCreatePengirimanMutation,
  useUpdatePengirimanMutation,
  useDeletePengirimanMutation,
} from "./queries";

export { generatePengirimanNo } from "./api";

export function usePengiriman(dateFrom = null, dateTo = null) {
  const { data, isLoading, error, refetch } = usePengirimanQuery(dateFrom, dateTo);
  return { pengirimanList: data ?? [], loading: isLoading, error, reload: refetch };
}

export function useCreatePengiriman() {
  const { mutateAsync } = useCreatePengirimanMutation();
  return (payload) => mutateAsync(payload);
}

export function useUpdatePengiriman() {
  const { mutateAsync } = useUpdatePengirimanMutation();
  return (pengiriman, payload) => mutateAsync({ pengiriman, payload });
}

export function useDeletePengiriman() {
  const { mutateAsync } = useDeletePengirimanMutation();
  return (pengiriman) => mutateAsync(pengiriman);
}
