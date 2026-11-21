import { create } from "zustand";
import { persist } from "zustand/middleware";

const DRAFT_KEY = "transfer_draft_v1";

(function migrateLegacyDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !("state" in parsed)) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ state: parsed, version: 0 }));
    }
  } catch {}
})();

export interface TransferDraft {
  fromLoc?: string;
  toLoc?: string;
  notes?: string;
  selected?: unknown[];
  useCustomToLoc?: boolean;
  customToLocText?: string;
}

const EMPTY_DRAFT: TransferDraft = {
  fromLoc: undefined,
  toLoc: undefined,
  notes: undefined,
  selected: undefined,
  useCustomToLoc: undefined,
  customToLocText: undefined,
};

interface TransferDraftState extends TransferDraft {
  save: (draft: TransferDraft) => void;
  clear: () => void;
}

export const useTransferDraftStore = create<TransferDraftState>()(
  persist(
    (set) => ({
      ...EMPTY_DRAFT,
      save: (draft) => set(draft),
      clear: () => set(EMPTY_DRAFT),
    }),
    {
      name: DRAFT_KEY,
      partialize: (state) => ({
        fromLoc: state.fromLoc,
        toLoc: state.toLoc,
        notes: state.notes,
        selected: state.selected,
        useCustomToLoc: state.useCustomToLoc,
        customToLocText: state.customToLocText,
      }),
    },
  ),
);
