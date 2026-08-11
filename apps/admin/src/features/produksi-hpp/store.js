/**
 * features/produksi-hpp/store.js
 * Zustand — state client filter grid Template HPP (ProduksiHPPPage, tab
 * "template"). Pola sama persis dengan produksi-record/store.js dan
 * produk/store.js: `applied` (dipakai buat filter grid) vs `draft` (lagi
 * diedit di dalam HPPFilterModal) supaya modal bisa pola "Terapkan".
 *
 * TIDAK pakai `persist` — filter ini state sesi kerja, bukan draft yang
 * perlu tahan reload.
 */
import { create } from "zustand";

export const DEFAULT_HPP_FILTER = {
  hppMin: "", // rentang total_hpp
  hppMax: "",
  sort: "kode-za", // "kode-za" | "kode-az" | "hpp-tertinggi" | "hpp-terendah"
};

export const useHppTemplateFilterStore = create((set) => ({
  applied: { ...DEFAULT_HPP_FILTER },
  draft: { ...DEFAULT_HPP_FILTER },
  isModalOpen: false,

  openModal: () => set((s) => ({ isModalOpen: true, draft: { ...s.applied } })),
  closeModal: () => set((s) => ({ isModalOpen: false, draft: { ...s.applied } })),

  setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),

  applyDraft: () => set((s) => ({ applied: { ...s.draft }, isModalOpen: false })),

  resetAll: () =>
    set({
      applied: { ...DEFAULT_HPP_FILTER },
      draft: { ...DEFAULT_HPP_FILTER },
      isModalOpen: false,
    }),
}));
