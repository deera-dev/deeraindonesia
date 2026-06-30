import { create } from "zustand";
import { persist } from "zustand/middleware";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// Menggantikan localStorage manual (shouldShowModalToday/markModalShown) yang
// sebelumnya diakses langsung di komponen Catalog.jsx — lihat CLAUDE.md §13 +
// ARCHITECTURE.md §11.5 (persist middleware Zustand adalah mekanisme resmi
// pengganti akses localStorage manual di komponen).
export const useVisitUsModalStore = create(
  persist(
    (set, get) => ({
      lastShownDate: null,
      open: false,
      initOpen: () => {
        set({ open: get().lastShownDate !== todayStr() });
      },
      show: () => set({ open: true }),
      close: () => set({ open: false, lastShownDate: todayStr() }),
    }),
    {
      name: "deera-catalog-visit-us",
      partialize: (state) => ({ lastShownDate: state.lastShownDate }),
    },
  ),
);
