import { create } from "zustand";
import { persist } from "zustand/middleware";

const DRAFT_KEY = "pos_kasir_draft_v1";

const EMPTY_DRAFT = {
  cart: [],
  showDiskon: false,
  diskonInput: "",
  diskonMode: "rp",
  editingKeep: null,
};

export const useKasirDraftStore = create(
  persist(
    (set) => ({
      ...EMPTY_DRAFT,
      setCart: (updater) =>
        set((s) => ({ cart: typeof updater === "function" ? updater(s.cart) : updater })),
      setShowDiskon: (v) => set({ showDiskon: v }),
      setDiskonInput: (v) => set({ diskonInput: v }),
      setDiskonMode: (v) => set({ diskonMode: v }),
      setEditingKeep: (v) => set({ editingKeep: v }),
      resetDraft: () => set({ ...EMPTY_DRAFT }),
    }),
    {
      name: DRAFT_KEY,
      partialize: (state) => ({
        cart: state.cart,
        showDiskon: state.showDiskon,
        diskonInput: state.diskonInput,
        diskonMode: state.diskonMode,
        editingKeep: state.editingKeep,
      }),
    },
  ),
);
