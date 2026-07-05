/**
 * features/stok-opname/store.js
 * Draft perubahan stok opname yang belum disimpan — dipersist supaya tidak
 * hilang kalau halaman ke-refresh sebelum sempat klik Simpan.
 *
 * Menggantikan localStorage manual (STOK_OPNAME_DRAFT_KEY) yang sebelumnya
 * diakses langsung di StokOpname.jsx — lihat CLAUDE.md §13 + ARCHITECTURE.md
 * §11.5 (persist middleware Zustand adalah mekanisme resmi pengganti akses
 * localStorage manual di komponen). Key localStorage TETAP "stok_opname_draft_v1"
 * supaya draft yang sedang in-flight milik user tidak hilang saat migrasi.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

const DRAFT_KEY = "stok_opname_draft_v1";

// Migrasi satu-kali: localStorage lama menyimpan `changed` mentah (bukan
// dibungkus {state, version} ala Zustand persist). Tanpa ini, draft in-flight
// milik user akan diam-diam hilang saat pertama kali load setelah migrasi.
(function migrateLegacyDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !("state" in parsed)) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ state: { changed: parsed }, version: 0 }));
    }
  } catch {
    // raw rusak / bukan JSON — biarkan persist Zustand mulai dari kosong
  }
})();

export const useStokOpnameDraftStore = create(
  persist(
    (set) => ({
      // { [rowId]: { gudang?, cideng?, tegalgubug? } }
      changed: {},

      setValue: (rowId, loc, val) =>
        set((state) => {
          const n = { ...state.changed };
          const current = { ...(n[rowId] ?? {}) };

          if (val === "" || val === null || val === undefined) {
            delete current[loc];
          } else {
            current[loc] = Math.max(0, parseInt(val) || 0);
          }

          if (Object.keys(current).length === 0) delete n[rowId];
          else n[rowId] = current;

          return { changed: n };
        }),

      clear: () => set({ changed: {} }),
    }),
    {
      name: DRAFT_KEY,
      partialize: (state) => ({ changed: state.changed }),
    },
  ),
);
