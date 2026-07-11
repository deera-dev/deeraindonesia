/**
 * queries.js — useQuery/useMutation wrapper di atas api.js.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createBatches, deleteBatchAndProduct, fetchBatches, resyncBahanDipakai, updateBatch } from "./api";

export const produksiRecordKeys = {
  batches: ["produksi-record", "batches"],
};

export function useBatchesQuery() {
  return useQuery({
    queryKey: produksiRecordKeys.batches,
    queryFn: fetchBatches,
  });
}

export function useCreateBatchesMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entries, shared }) => createBatches(entries, shared),
    onSuccess: () => qc.invalidateQueries({ queryKey: produksiRecordKeys.batches }),
  });
}

export function useUpdateBatchMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, extraEntries, shared }) => updateBatch(payload, extraEntries, shared),
    onSuccess: () => qc.invalidateQueries({ queryKey: produksiRecordKeys.batches }),
  });
}

export function useDeleteBatchMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batch) => deleteBatchAndProduct(batch),
    onSuccess: () => qc.invalidateQueries({ queryKey: produksiRecordKeys.batches }),
  });
}

// Sinkronkan ulang bahan_dipakai satu batch dari Template HPP terkini —
// lihat catatan di api.js resyncBahanDipakai() untuk alasan fungsi ini ada.
export function useResyncBahanDipakaiMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batch) => resyncBahanDipakai(batch),
    onSuccess: () => qc.invalidateQueries({ queryKey: produksiRecordKeys.batches }),
  });
}
