import { create } from "zustand";
import { persist } from "zustand/middleware";

function todayStr(): string {
  return new Date().toISOString().split("T")[0]!;
}

interface VisitUsModalState {
  lastShownDate: string | null;
  open: boolean;
  initOpen: () => void;
  show: () => void;
  close: () => void;
}

export const useVisitUsModalStore = create<VisitUsModalState>()(
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

interface CatalogSearchState {
  open: boolean;
  query: string;
  show: () => void;
  close: () => void;
  setQuery: (query: string) => void;
}

export const useCatalogSearchStore = create<CatalogSearchState>((set) => ({
  open: false,
  query: "",
  show: () => set({ open: true }),
  close: () => set({ open: false, query: "" }),
  setQuery: (query) => set({ query }),
}));

interface CatalogFilterState {
  open: boolean;
  bahan: string | null;
  ukuran: string | null;
  show: () => void;
  close: () => void;
  setBahan: (bahan: string) => void;
  setUkuran: (ukuran: string) => void;
  reset: () => void;
}

export const useCatalogFilterStore = create<CatalogFilterState>((set) => ({
  open: false,
  bahan: null,
  ukuran: null,
  show: () => set({ open: true }),
  close: () => set({ open: false }),
  setBahan: (bahan) => set((s) => ({ bahan: s.bahan === bahan ? null : bahan })),
  setUkuran: (ukuran) => set((s) => ({ ukuran: s.ukuran === ukuran ? null : ukuran })),
  reset: () => set({ bahan: null, ukuran: null }),
}));

interface GrosirInfoState {
  open: boolean;
  show: () => void;
  close: () => void;
}

export const useGrosirInfoStore = create<GrosirInfoState>((set) => ({
  open: false,
  show: () => set({ open: true }),
  close: () => set({ open: false }),
}));

interface CatalogScrollState {
  lastActiveKode: string | null;
  setLastActiveKode: (kode: string | null) => void;
}

export const useCatalogScrollStore = create<CatalogScrollState>((set) => ({
  lastActiveKode: null,
  setLastActiveKode: (kode) => set({ lastActiveKode: kode }),
}));
