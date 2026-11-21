import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WoDraft } from "./schema";

interface WoDraftState {
  drafts: Record<string, WoDraft>;
  saveDraft: (sampelId: string, patch: Partial<WoDraft>) => void;
  clearDraft: (sampelId: string) => void;
}

export const useWoDraftStore = create<WoDraftState>()(
  persist(
    (set) => ({
      drafts: {},
      saveDraft: (sampelId, patch) =>
        set((s) => ({
          drafts: { ...s.drafts, [sampelId]: { ...s.drafts[sampelId], ...patch } },
        })),
      clearDraft: (sampelId) =>
        set((s) => {
          const drafts = { ...s.drafts };
          delete drafts[sampelId];
          return { drafts };
        }),
    }),
    { name: "wo_draft_v1" },
  ),
);
