/**
 * features/produk/hooks.js
 * PUBLIC SURFACE fitur produk — komponen HANYA boleh import dari sini.
 */
import {
  useStokMapQuery,
  useStokWarnaByKodeQuery,
  useSalesByKodeQuery,
  useSaveProductMutation,
  useDeleteProductCascadeMutation,
} from "./queries";

export { usePushNotification } from "./usePushNotification";

export function useStokMap() {
  const { data, refetch } = useStokMapQuery();
  return { stokMap: data ?? {}, reload: refetch };
}

export function useStokWarnaByKode(kode, options) {
  const { data, isLoading } = useStokWarnaByKodeQuery(kode, options);
  return { stokWarnaMap: data ?? {}, loading: isLoading };
}

export function useSalesByKode(kode) {
  const { data, isLoading } = useSalesByKodeQuery(kode);
  return { data: data ?? { gudang: 0, cideng: 0, tegalgubug: 0, total: 0 }, isLoading };
}

export function useSaveProduct() {
  const { mutateAsync } = useSaveProductMutation();
  return (payload) => mutateAsync(payload);
}

export function useDeleteProductCascade() {
  const { mutateAsync } = useDeleteProductCascadeMutation();
  return (kode) => mutateAsync(kode);
}
