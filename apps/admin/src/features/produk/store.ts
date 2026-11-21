import { create } from "zustand";

export interface ProductFilter {
  size: string;
  warna: string;
  stokStatus: string;
  lokasi: string;
  hargaMin: string;
  hargaMax: string;
  hppMin: string;
  hppMax: string;
  sort: string;
}

export const DEFAULT_PRODUCT_FILTER: ProductFilter = {
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

interface ProductFilterState {
  applied: ProductFilter;
  draft: ProductFilter;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  setDraft: (patch: Partial<ProductFilter>) => void;
  applyDraft: () => void;
  resetAll: () => void;
}

export const useProductFilterStore = create<ProductFilterState>((set) => ({
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
