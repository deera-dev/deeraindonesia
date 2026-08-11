/**
 * features/produksi-record/store.js
 * Zustand — state client filter grid Catatan Produksi (ProduksiRecordPage).
 *
 * Sama persis dengan pola produk/store.js: `applied` (yang benar-benar
 * dipakai buat filter list) vs `draft` (yang lagi diedit di dalam
 * BatchFilterModal) supaya modal bisa pola "Terapkan".
 *
 * TIDAK pakai `persist` — filter ini state sesi kerja, bukan draft yang
 * perlu tahan reload seperti transfer/stok-opname.
 */
import { create } from "zustand";

export const DEFAULT_BATCH_FILTER = {
  tanggalMin: "", // "" | yyyy-mm-dd
  tanggalMax: "",
  potongMin: "", // total_kain (jumlah potong)
  potongMax: "",
  hppMin: "", // hpp_per_item
  hppMax: "",
  upahJahitMin: "",
  upahJahitMax: "",
  bahanStatus: "semua", // "semua" | "sinkron" | "belum"
  sort: "terbaru", // "terbaru" | "terlama" | "potong-terbanyak" | "potong-tersedikit" | "hpp-tertinggi" | "hpp-terendah"
};

export const useBatchFilterStore = create((set) => ({
  applied: { ...DEFAULT_BATCH_FILTER },
  draft: { ...DEFAULT_BATCH_FILTER },
  isModalOpen: false,

  openModal: () => set((s) => ({ isModalOpen: true, draft: { ...s.applied } })),
  closeModal: () => set((s) => ({ isModalOpen: false, draft: { ...s.applied } })),

  setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),

  applyDraft: () => set((s) => ({ applied: { ...s.draft }, isModalOpen: false })),

  resetAll: () =>
    set({
      applied: { ...DEFAULT_BATCH_FILTER },
      draft: { ...DEFAULT_BATCH_FILTER },
      isModalOpen: false,
    }),
}));
