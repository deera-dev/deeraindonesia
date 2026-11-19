import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useWoDraftStore = create(
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
