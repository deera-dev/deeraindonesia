import { create } from "zustand";

export const DEFAULT_PRODUCT_FILTER = {
  size: "",
  warna: "",
  stokStatus: "semua",
  lokasi: "semua",
  hargaMin: "",
  hargaMax: "",
  hppMin: "",
  hppMax: "",
  sort: "terbaru",
};

export const useProductFilterStore = create((set, get) => ({
  applied: { ...DEFAULT_PRODUCT_FILTER },
  draft: { ...DEFAULT_PRODUCT_FILTER },
  isModalOpen: false,

  openModal: () => set((s) => ({ isModalOpen: true, draft: { ...s.applied } })),
  closeModal: () => set((s) => ({ isModalOpen: false, draft: { ...s.applied } })),

  setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),

  applyDraft: () => set((s) => ({ applied: { ...s.draft }, isModalOpen: false })),

  resetAll: () =>
    set({
      applied: { ...DEFAULT_PRODUCT_FILTER },
      draft: { ...DEFAULT_PRODUCT_FILTER },
      isModalOpen: false,
    }),
}));
