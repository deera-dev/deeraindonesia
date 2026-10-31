import { create } from "zustand";
import { persist } from "zustand/middleware";

interface VisitorState {
  visitorId: string | null;
  internal: boolean;
  markInternal: () => void;
  ensureVisitorId: () => string;
}

export const useVisitorStore = create<VisitorState>()(
  persist(
    (set, get) => ({
      visitorId: null,
      internal: false,
      markInternal: () => set({ internal: true }),
      ensureVisitorId: () => {
        let id = get().visitorId;
        if (!id) {
          id =
            globalThis.crypto?.randomUUID?.() ??
            `v${Date.now()}${Math.random().toString(16).slice(2)}`;
          set({ visitorId: id });
        }
        return id;
      },
    }),
    { name: "deera-catalog-visitor" },
  ),
);
