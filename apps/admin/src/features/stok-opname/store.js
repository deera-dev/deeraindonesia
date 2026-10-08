/**
 * features/stok-opname/store.js
 * Sesi stok opname (dipersist): lokasi yang sedang dihitung, produk yang sudah
 * dihitung per lokasi (beserta selisihnya), dan apakah panduan singkat sudah
 * ditutup. Angka yang diketik TIDAK disimpan di sini — tiap produk disimpan
 * sendiri ke database saat tombol Simpan ditekan.
 *
 * Key baru "stok_opname_session_v1" (draft besar lama "stok_opname_draft_v1"
 * tidak dipakai lagi).
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useStokOpnameSessionStore = create(
  persist(
    (set) => ({
      loc: null, // "gudang" | "cideng" | "tegalgubug"
      counted: {}, // { [loc]: { [kode]: { at: ISO, selisih: number } } }
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
