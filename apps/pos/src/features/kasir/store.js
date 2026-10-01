/**
 * features/kasir/store.js — draft keranjang kasir (cart + state diskon).
 *
 * Kasus bug (Denny 2026-09-30):
 *   1. "di POS halaman pesanan, kalau pindah aplikasi, produknya hilang" —
 *      lihat fix terpisah di apps/pos/src/lib/sync.js (syncProducts atomik+lock).
 *   2. "ketika ada pesanan masih draft/blm selesai, pindah ke tab lain,
 *      draftnya ilang" — sebelumnya cart/diskon di useCart() (hooks.js)
 *      adalah useState lokal biasa, jadi hancur total begitu KasirPage
 *      unmount (navigasi ke /laporan, /pelanggan, /riwayat — React Router
 *      me-unmount index route sepenuhnya, lihat App.jsx).
 *   4. "ga sengaja terefresh halamannya karena di HP kalau discroll keatas
 *      mentok suka gasengaja malah ke refresh" — akar masalah sama persis
 *      dengan #2 (state hilang), bedanya cuma pemicunya (reload penuh,
 *      bukan navigasi SPA).
 *
 * Fix: pindahkan `cart`, `showDiskon`, `diskonInput`, `diskonMode` dari
 * useState ke store Zustand + middleware `persist` (CLAUDE.md §13: draft yang
 * perlu tahan reload WAJIB lewat sini, bukan localStorage manual). Field lain
 * di useCart() (warnaPanel, selectedWarna, selectedBreakdown, showCart,
 * gabungan, editingPrice) SENGAJA tetap useState lokal — itu state transient
 * bottom-sheet/UI yang wajar hilang saat reload, bukan "pesanan yang sudah
 * masuk". `buyerName`/`buyerHp`/`pelangganId`/Tukar-Tambah di KasirPage.jsx
 * JUGA belum dipersist (di luar scope keluhan literal "produk yang sudah
 * masuk hilang") — follow-up terpisah kalau diperlukan nanti.
 *
 * Public surface: komponen TIDAK PERNAH import store ini langsung — selalu
 * lewat useCart() di ./hooks.js (Dependency Inversion, lihat CLAUDE.md §7).
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

const DRAFT_KEY = "pos_kasir_draft_v1";

const EMPTY_DRAFT = {
  cart: [],
  showDiskon: false,
  diskonInput: "",
  diskonMode: "rp",
};

export const useKasirDraftStore = create(
  persist(
    (set) => ({
      ...EMPTY_DRAFT,
      setCart: (updater) =>
        set((s) => ({ cart: typeof updater === "function" ? updater(s.cart) : updater })),
      setShowDiskon: (v) => set({ showDiskon: v }),
      setDiskonInput: (v) => set({ diskonInput: v }),
      setDiskonMode: (v) => set({ diskonMode: v }),
      resetDraft: () => set({ ...EMPTY_DRAFT }),
    }),
    {
      name: DRAFT_KEY,
      partialize: (state) => ({
        cart: state.cart,
        showDiskon: state.showDiskon,
        diskonInput: state.diskonInput,
        diskonMode: state.diskonMode,
      }),
    },
  ),
);
