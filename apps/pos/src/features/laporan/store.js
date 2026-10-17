import { create } from "zustand";
import { DEFAULT_SUB_TAB } from "./subTabs";

export const useLaporanSubTabStore = create((set) => ({
  subTab: DEFAULT_SUB_TAB,
  setSubTab: (subTab) => set({ subTab }),
}));
