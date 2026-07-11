/**
 * hooks.js — PUBLIC SURFACE fitur catatan produksi batch.
 * Komponen HANYA boleh import dari sini (atau index.js).
 */
export { fetchHppTemplate } from "./api";
import {
  useBatchesQuery,
  useCreateBatchesMutation,
  useDeleteBatchMutation,
  useResyncBahanDipakaiMutation,
  useUpdateBatchMutation,
} from "./queries";

export function useBatches() {
  const { data, isLoading } = useBatchesQuery();
  return { batches: data ?? [], loading: isLoading };
}

export function useCreateBatches() {
  const { mutateAsync } = useCreateBatchesMutation();
  return (entries, shared) => mutateAsync({ entries, shared });
}

export function useUpdateBatch() {
  const { mutateAsync } = useUpdateBatchMutation();
  return (payload, extraEntries, shared) => mutateAsync({ payload, extraEntries, shared });
}

export function useDeleteBatch() {
  const { mutateAsync } = useDeleteBatchMutation();
  return (batch) => mutateAsync(batch);
}

// Sinkronkan ulang bahan_dipakai satu batch dari Template HPP terkini —
// dipakai BatchCard saat batch tidak punya pemakaian bahan tercatat
// (Template HPP belum ada saat batch dibuat). Lihat api.js resyncBahanDipakai().
export function useResyncBahanDipakai() {
  const { mutateAsync } = useResyncBahanDipakaiMutation();
  return (batch) => mutateAsync(batch);
}

// Lookup template HPP per kode produk — dipakai saat user mengisi kode
// produk di form. Bukan TanStack Query: dipanggil on-demand per entry dengan
// tracking loading/fetched manual di state form (lihat BatchForm/ProductEntryCard).
export async function lookupHppTemplate(kode) {
  return fetchHppTemplate(kode);
}
