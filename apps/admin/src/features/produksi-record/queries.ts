import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBatches,
  deleteBatchAndProduct,
  fetchBatches,
  fetchKaryawanPotong,
  resyncBahanDipakai,
  updateBatch,
} from "./api";
import type { BatchEntry, ProduksiBatch, SharedBatchFields, UpdateBatchPayload } from "./schema";

export const produksiRecordKeys = {
  batches: ["produksi-record", "batches"],
  karyawanPotong: ["produksi-record", "karyawan-potong"],
};

export function useBatchesQuery() {
  return useQuery({
    queryKey: produksiRecordKeys.batches,
    queryFn: fetchBatches,
  });
}

export function useKaryawanPotongQuery() {
  return useQuery({
    queryKey: produksiRecordKeys.karyawanPotong,
    queryFn: fetchKaryawanPotong,
  });
}

export function useCreateBatchesMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entries, shared }: { entries: BatchEntry[]; shared: SharedBatchFields }) =>
      createBatches(entries, shared),
    onSuccess: () => qc.invalidateQueries({ queryKey: produksiRecordKeys.batches }),
  });
}

export function useUpdateBatchMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      payload,
      extraEntries,
      shared,
    }: {
      payload: UpdateBatchPayload;
      extraEntries?: unknown;
      shared?: unknown;
    }) => updateBatch(payload, extraEntries, shared),
    onSuccess: () => qc.invalidateQueries({ queryKey: produksiRecordKeys.batches }),
  });
}

export function useDeleteBatchMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batch: ProduksiBatch) => deleteBatchAndProduct(batch),
    onSuccess: () => qc.invalidateQueries({ queryKey: produksiRecordKeys.batches }),
  });
}

export function useResyncBahanDipakaiMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batch: ProduksiBatch) => resyncBahanDipakai(batch),
    onSuccess: () => qc.invalidateQueries({ queryKey: produksiRecordKeys.batches }),
  });
}
