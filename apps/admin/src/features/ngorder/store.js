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

const LEGACY_RENCANA_KEY = "ngorder_peta_rencana_v1";

export function readLegacyRencanaIds() {
  try {
    const raw = window.localStorage.getItem(LEGACY_RENCANA_KEY);
    const ids = raw ? JSON.parse(raw)?.state?.selectedIds : null;
    return Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function clearLegacyRencana() {
  try {
    window.localStorage.removeItem(LEGACY_RENCANA_KEY);
  } catch {
    return;
  }
}
