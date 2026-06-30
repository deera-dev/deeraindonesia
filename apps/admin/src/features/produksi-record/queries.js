/**
 * queries.js — useQuery/useMutation wrapper di atas api.js.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createBatches, deleteBatchAndProduct, fetchBatches, updateBatch } from "./api";

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
