import { useLaporanSubTabStore } from "./store";
import { getSubTabMeta } from "./subTabs";

export function useLaporanSubTab() {
  const subTab = useLaporanSubTabStore((s) => s.subTab);
  const setSubTab = useLaporanSubTabStore((s) => s.setSubTab);
  return { subTab, setSubTab, meta: getSubTabMeta(subTab) };
}
