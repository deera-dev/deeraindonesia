import { create } from "zustand";
import { persist } from "zustand/middleware";

export const usePetaFilterStore = create(
  persist(
    (set) => ({
      daerah: "",
      approach: "",
      search: "",
      sheetTab: "rencana",
      setFilter: (patch) => set(patch),
      resetFilter: () => set({ daerah: "", approach: "", search: "" }),
    }),
    {
      name: "ngorder_peta_filter_v1",
      partialize: (s) => ({ daerah: s.daerah, approach: s.approach, sheetTab: s.sheetTab }),
    },
  ),
);
