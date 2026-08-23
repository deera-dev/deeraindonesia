/**
 * features/produk/hooks.js
 * PUBLIC SURFACE fitur produk — komponen HANYA boleh import dari sini.
 */
import {
  useStokMapQuery,
  useStokWarnaByKodeQuery,
  useSalesByKodeQuery,
  useSoldQtyMapQuery,
  useProducedByKodeQuery,
  useSaveProductMutation,
  useDeleteProductCascadeMutation,
} from "./queries";
import { useProductFilterStore, DEFAULT_PRODUCT_FILTER } from "./store";

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

export function useSoldQtyMap() {
  const { data } = useSoldQtyMapQuery();
  return data ?? {};
}

export function useProducedByKode(kode) {
  const { data, isLoading } = useProducedByKodeQuery(kode);
  return { producedBySize: data ?? {}, isLoading };
}

export function useSaveProduct() {
  const { mutateAsync } = useSaveProductMutation();
  return (payload) => mutateAsync(payload);
}

export function useDeleteProductCascade() {
  const { mutateAsync } = useDeleteProductCascadeMutation();
  return (kode) => mutateAsync(kode);
}

export function useProductFilter() {
  const applied = useProductFilterStore((s) => s.applied);
  const draft = useProductFilterStore((s) => s.draft);
  const isModalOpen = useProductFilterStore((s) => s.isModalOpen);
  const openModal = useProductFilterStore((s) => s.openModal);
  const closeModal = useProductFilterStore((s) => s.closeModal);
  const setDraft = useProductFilterStore((s) => s.setDraft);
  const applyDraft = useProductFilterStore((s) => s.applyDraft);
  const resetAll = useProductFilterStore((s) => s.resetAll);

  const hasActiveFilter = Object.keys(DEFAULT_PRODUCT_FILTER).some(
    (key) => applied[key] !== DEFAULT_PRODUCT_FILTER[key],
  );

  return {
    applied,
    draft,
    isModalOpen,
    openModal,
    closeModal,
    setDraft,
    applyDraft,
    resetAll,
    hasActiveFilter,
  };
}
