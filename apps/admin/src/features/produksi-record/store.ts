import { create } from "zustand";
import type { BatchFilter } from "./schema";

export const DEFAULT_BATCH_FILTER: BatchFilter = {
  tanggalMin: "",
  tanggalMax: "",
  potongMin: "",
  potongMax: "",
  hppMin: "",
  hppMax: "",
  upahJahitMin: "",
  upahJahitMax: "",
  bahanStatus: "semua",
  sort: "terbaru",
};

interface BatchFilterState {
  applied: BatchFilter;
  draft: BatchFilter;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  setDraft: (patch: Partial<BatchFilter>) => void;
  applyDraft: () => void;
  resetAll: () => void;
}

export const useBatchFilterStore = create<BatchFilterState>()((set) => ({
  applied: { ...DEFAULT_BATCH_FILTER },
  draft: { ...DEFAULT_BATCH_FILTER },
  isModalOpen: false,

  openModal: () => set((s) => ({ isModalOpen: true, draft: { ...s.applied } })),
  closeModal: () => set((s) => ({ isModalOpen: false, draft: { ...s.applied } })),

  setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),

  applyDraft: () => set((s) => ({ applied: { ...s.draft }, isModalOpen: false })),

  resetAll: () =>
    set({
      applied: { ...DEFAULT_BATCH_FILTER },
      draft: { ...DEFAULT_BATCH_FILTER },
      isModalOpen: false,
    }),
}));
