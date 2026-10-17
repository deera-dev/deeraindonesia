import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useStokOpnameSessionStore = create(
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
