import { create } from "zustand";
import { DEFAULT_SUB_TAB } from "./subTabs";

// Sub-tab aktif halaman Transaksi/Laporan — dibagi dengan bottom nav supaya
// label & ikon tab ikut berubah (default: transaksi, tidak dipersist).
export const useLaporanSubTabStore = create((set) => ({
  subTab: DEFAULT_SUB_TAB,
  setSubTab: (subTab) => set({ subTab }),
}));
