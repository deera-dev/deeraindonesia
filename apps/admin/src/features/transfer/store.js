/**
 * features/transfer/store.js
 * Draft "buat transfer baru" yang belum disimpan — dipersist supaya tidak
 * hilang kalau modal/form ke-refresh sebelum sempat klik simpan.
 *
 * Menggantikan localStorage manual (DRAFT_KEY) yang sebelumnya diakses
 * langsung di TransferForm.jsx — lihat CLAUDE.md §13 + ARCHITECTURE.md §11.5
 * (persist middleware Zustand adalah mekanisme resmi pengganti akses
 * localStorage manual di komponen). Key localStorage TETAP "transfer_draft_v1"
 * supaya draft in-flight milik user tidak hilang saat migrasi.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

const DRAFT_KEY = "transfer_draft_v1";

// Migrasi satu-kali: localStorage lama menyimpan draft mentah (bukan
// dibungkus {state, version} ala Zustand persist).
(function migrateLegacyDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !("state" in parsed)) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ state: parsed, version: 0 }));
    }
  } catch {
    // raw rusak / bukan JSON — biarkan persist Zustand mulai dari kosong
  }
})();

const EMPTY_DRAFT = {
  fromLoc: undefined,
  toLoc: undefined,
  notes: undefined,
  selected: undefined,
  useCustomToLoc: undefined,
  customToLocText: undefined,
};

export const useTransferDraftStore = create(
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
