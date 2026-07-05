/**
 * features/produksi-laporan/hooks.js
 * PUBLIC SURFACE — komponen import HANYA dari sini (atau index.js).
 */
import { useProduksiBatchesQuery, useTagihanJatuhTempoQuery, useProduksiBatchesTotalQuery } from "./queries";

export function useProduksiBatches({ fromDate, toDate }) {
  const { data, isLoading } = useProduksiBatchesQuery({ fromDate, toDate });
  return { batches: data ?? [], loading: isLoading };
}

export function useTagihanJatuhTempo({ fromDate, toDate }) {
  const { data, isLoading } = useTagihanJatuhTempoQuery({ fromDate, toDate });
  return { tagihan: data ?? [], loading: isLoading };
}

export function useProduksiBatchesTotal() {
  const { data, isLoading } = useProduksiBatchesTotalQuery();
  const batches = data ?? [];
  const totalBaju = batches.reduce((s, b) => s + (b.total_kain ?? 0), 0);
  const totalModal = batches.reduce((s, b) => s + (b.hpp_per_item || 0) * (b.total_kain || 0), 0);
  return { totalBaju, totalModal, totalBatch: batches.length, loading: isLoading };
}
