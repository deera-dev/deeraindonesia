import { create } from "zustand";

export const DEFAULT_BATCH_FILTER = {
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

export const useBatchFilterStore = create((set) => ({
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
