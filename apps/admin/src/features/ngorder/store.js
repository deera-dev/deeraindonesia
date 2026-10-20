import { create } from "zustand";
import { persist } from "zustand/middleware";

const KEY = "ngorder_peta_rencana_v1";

export const usePetaRencanaStore = create(
  persist(
    (set) => ({
      selectedIds: [],
      toggle: (id) =>
        set((s) => ({
          selectedIds: s.selectedIds.includes(id)
            ? s.selectedIds.filter((x) => x !== id)
            : [...s.selectedIds, id],
        })),
      addMany: (ids) =>
        set((s) => ({ selectedIds: Array.from(new Set([...s.selectedIds, ...ids])) })),
      clear: () => set({ selectedIds: [] }),
    }),
    {
      name: KEY,
      partialize: (state) => ({ selectedIds: state.selectedIds }),
    },
  ),
);
