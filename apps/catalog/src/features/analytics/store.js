import { create } from "zustand";
import { persist } from "zustand/middleware";

/** ID pengunjung anonim (acak, tanpa data pribadi) — untuk menghitung pengunjung unik. */
export const useVisitorStore = create(
  persist(
    (set, get) => ({
      visitorId: null,
      ensureVisitorId: () => {
        let id = get().visitorId;
        if (!id) {
          id = globalThis.crypto?.randomUUID?.() ?? `v${Date.now()}${Math.random().toString(16).slice(2)}`;
          set({ visitorId: id });
        }
        return id;
      },
    }),
    { name: "deera-catalog-visitor" },
  ),
);
