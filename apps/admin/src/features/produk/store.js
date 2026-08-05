/**
 * features/produk/store.js
 * Zustand — state client filter grid produk (Admin Page).
 *
 * Dipisah jadi `applied` (yang benar-benar dipakai buat filter grid) vs
 * `draft` (yang lagi diedit di dalam ProductFilterModal) supaya modal bisa
 * pola "Terapkan" — user ubah beberapa field dulu di draft, grid baru
 * ke-update pas tombol Terapkan ditekan (bukan apply-on-change).
 *
 * TIDAK pakai `persist` — filter ini state sesi kerja, bukan draft yang
 * perlu tahan reload seperti transfer/stok-opname.
 */
import { create } from "zustand";

export const DEFAULT_PRODUCT_FILTER = {
  size: "", // "" | salah satu SIZE_PRESETS[].size
  warna: "", // "" | salah satu warna produk
  stokStatus: "semua", // "semua" | "ada" | "habis"
  lokasi: "semua", // "semua" | "gudang" | "cideng" | "tegalgubug" — ada stok (>0) di lokasi itu
  hargaMin: "",
  hargaMax: "",
  hppMin: "",
  hppMax: "",
  sort: "terbaru", // "terbaru" | "terlaris"
};

export const useProductFilterStore = create((set, get) => ({
  applied: { ...DEFAULT_PRODUCT_FILTER },
  draft: { ...DEFAULT_PRODUCT_FILTER },
  isModalOpen: false,

  openModal: () => set((s) => ({ isModalOpen: true, draft: { ...s.applied } })),
  closeModal: () => set((s) => ({ isModalOpen: false, draft: { ...s.applied } })),

  setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),

  applyDraft: () => set((s) => ({ applied: { ...s.draft }, isModalOpen: false })),

  resetAll: () =>
    set({
      applied: { ...DEFAULT_PRODUCT_FILTER },
      draft: { ...DEFAULT_PRODUCT_FILTER },
      isModalOpen: false,
    }),
}));
