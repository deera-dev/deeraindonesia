import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * store.js — daftar kode produk favorit reseller, disimpan lokal (tanpa
 * akun) via persist middleware. kodes disimpan sebagai array (bukan Set)
 * karena Set tidak bisa di-serialize JSON.stringify secara langsung —
 * hooks.js yang membungkus ini yang mengubahnya jadi Set untuk konsumen.
 */
export const useFavoritesStore = create(
  persist(
    (set, get) => ({
      kodes: [],
      toggle: (kode) =>
        set((s) => ({
          kodes: s.kodes.includes(kode)
            ? s.kodes.filter((k) => k !== kode)
            : [...s.kodes, kode],
        })),
      isFavorite: (kode) => get().kodes.includes(kode),
      clear: () => set({ kodes: [] }),
    }),
    { name: "deera-catalog-favorites" },
  ),
);
