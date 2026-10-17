export { fetchHppTemplate } from "./api";
import {
  useBatchesQuery,
  useCreateBatchesMutation,
  useDeleteBatchMutation,
  useResyncBahanDipakaiMutation,
  useUpdateBatchMutation,
} from "./queries";
import { useBatchFilterStore, DEFAULT_BATCH_FILTER } from "./store";

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

export function useResyncBahanDipakai() {
  const { mutateAsync } = useResyncBahanDipakaiMutation();
  return (batch) => mutateAsync(batch);
}

export async function lookupHppTemplate(kode) {
  return fetchHppTemplate(kode);
}

export function useBatchFilter() {
  const applied = useBatchFilterStore((s) => s.applied);
  const draft = useBatchFilterStore((s) => s.draft);
  const isModalOpen = useBatchFilterStore((s) => s.isModalOpen);
  const openModal = useBatchFilterStore((s) => s.openModal);
  const closeModal = useBatchFilterStore((s) => s.closeModal);
  const setDraft = useBatchFilterStore((s) => s.setDraft);
  const applyDraft = useBatchFilterStore((s) => s.applyDraft);
  const resetAll = useBatchFilterStore((s) => s.resetAll);

  const hasActiveFilter = Object.keys(DEFAULT_BATCH_FILTER).some(
    (key) => applied[key] !== DEFAULT_BATCH_FILTER[key],
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
