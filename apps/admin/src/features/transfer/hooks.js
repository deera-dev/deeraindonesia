import { useTransferDraftStore } from "./store";

export function readTransferDraft() {
  return useTransferDraftStore.getState();
}

export function useTransferDraftActions() {
  const save = useTransferDraftStore((s) => s.save);
  const clear = useTransferDraftStore((s) => s.clear);
  return { saveDraft: save, clearDraft: clear };
}
