import { create } from "zustand";
import { persist } from "zustand/middleware";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

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


export const useCatalogSearchStore = create((set) => ({
  open: false,
  query: "",
  show: () => set({ open: true }),
  close: () => set({ open: false, query: "" }),
  setQuery: (query) => set({ query }),
}));


export const useCatalogFilterStore = create((set) => ({
  open: false,
  bahan: null,
  ukuran: null,
  show: () => set({ open: true }),
  close: () => set({ open: false }),
  setBahan: (bahan) => set((s) => ({ bahan: s.bahan === bahan ? null : bahan })),
  setUkuran: (ukuran) => set((s) => ({ ukuran: s.ukuran === ukuran ? null : ukuran })),
  reset: () => set({ bahan: null, ukuran: null }),
}));


export const useGrosirInfoStore = create((set) => ({
  open: false,
  show: () => set({ open: true }),
  close: () => set({ open: false }),
}));


export const useCatalogScrollStore = create((set) => ({
  lastActiveKode: null,
  setLastActiveKode: (kode) => set({ lastActiveKode: kode }),
}));
