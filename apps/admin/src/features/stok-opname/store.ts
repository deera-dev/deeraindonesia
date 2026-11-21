import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CountedEntry {
  at: string;
  selisih: number;
}

interface StokOpnameSessionState {
  loc: string | null;
  counted: Record<string, Record<string, CountedEntry>>;
  guideDismissed: boolean;
  setLoc: (loc: string | null) => void;
  markCounted: (loc: string, kode: string, selisih: number) => void;
  resetCounted: (loc: string) => void;
  dismissGuide: () => void;
  showGuide: () => void;
}

export const useStokOpnameSessionStore = create<StokOpnameSessionState>()(
  persist(
    (set) => ({
      loc: null,
      counted: {},
      guideDismissed: false,

      setLoc: (loc) => set({ loc }),
      markCounted: (loc, kode, selisih) =>
        set((s) => ({
          counted: {
            ...s.counted,
            [loc]: { ...(s.counted[loc] ?? {}), [kode]: { at: new Date().toISOString(), selisih } },
          },
        })),
      resetCounted: (loc) => set((s) => ({ counted: { ...s.counted, [loc]: {} } })),
      dismissGuide: () => set({ guideDismissed: true }),
      showGuide: () => set({ guideDismissed: false }),
    }),
    { name: "stok_opname_session_v1" },
  ),
);
