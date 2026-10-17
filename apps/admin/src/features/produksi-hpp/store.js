import { create } from "zustand";

export const DEFAULT_HPP_FILTER = {
  hppMin: "",
  hppMax: "",
  sort: "terbaru",
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
