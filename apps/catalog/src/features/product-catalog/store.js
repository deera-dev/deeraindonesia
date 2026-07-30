import { create } from "zustand";
import { persist } from "zustand/middleware";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// Menggantikan localStorage manual (shouldShowModalToday/markModalShown) yang
// sebelumnya diakses langsung di komponen Catalog.jsx — lihat CLAUDE.md §13 +
// ARCHITECTURE.md §11.5 (persist middleware Zustand adalah mekanisme resmi
// pengganti akses localStorage manual di komponen).
export const useVisitUsModalStore = create(
  persist(
    (set, get) => ({
      lastShownDate: null,
      open: false,
      initOpen: () => {
        set({ open: get().lastShownDate !== todayStr() });
      },
      show: () => set({ open: true }),
      close: () => set({ open: false, lastShownDate: todayStr() }),
    }),
    {
      name: "deera-catalog-visit-us",
      partialize: (state) => ({ lastShownDate: state.lastShownDate }),
    },
  ),
);


// Modal pencarian produk (search/jump by kode) — state dibagi antara tombol
// pemicu di CatalogPage dan SearchModal, jadi Zustand (bukan useState lokal
// biasa) sesuai CLAUDE.md §7. Tidak perlu persist — query & status buka/tutup
// tidak perlu tahan reload.
export const useCatalogSearchStore = create((set) => ({
  open: false,
  query: "",
  show: () => set({ open: true }),
  close: () => set({ open: false, query: "" }),
  setQuery: (query) => set({ query }),
}));


// Modal filter bahan/ukuran — state dibagi antara tombol pemicu di
// CatalogPage dan FilterModal, jadi Zustand (bukan useState lokal) sesuai
// CLAUDE.md §7. bahan/ukuran TIDAK di-reset saat modal ditutup (beda dari
// search) karena filter yang aktif harus tetap berlaku sampai user sendiri
// yang reset, bukan hilang begitu modal ditutup.
export const useCatalogFilterStore = create((set) => ({
  open: false,
  bahan: null,
  ukuran: null,
  show: () => set({ open: true }),
  close: () => set({ open: false }),
  setBahan: (bahan) => set((s) => ({ bahan: s.bahan === bahan ? null : bahan })),
  setUkuran: (ukuran) => set((s) => ({ ukuran: s.ukuran === ukuran ? null : ukuran })),
  reset: () => set({ bahan: null, ukuran: null }),
}));


// Menyimpan kode produk yang TERAKHIR AKTIF (paling terlihat di layar) di
// halaman katalog — dipakai CatalogPage utk restore posisi scroll saat
// user kembali dari halaman detail produk ke katalog (instruksi Denny:
// "pas ingin kembali ke katalog, ... kita kembali ke halaman produk yang
// sebelum diklik, jadinya kalau udah scroll agak kebawah ga repot scroll
// kebawah lagi"), alih-alih selalu mulai dari atas lagi.
//
// SENGAJA TIDAK pakai `persist` middleware (tidak perlu tahan reload penuh
// browser, beda dari useVisitUsModalStore di atas) — cukup bertahan
// selama SPA session ini. Ini otomatis terpenuhi karena Zustand store
// hidup di level modul (di luar tree komponen React), jadi TIDAK ikut
// ter-reset saat CatalogPage unmount ketika user pindah ke halaman detail
// produk, lalu terbaca lagi saat CatalogPage mount ulang ketika user
// kembali (baik lewat tombol "← Katalog" maupun tombol back browser).
export const useCatalogScrollStore = create((set) => ({
  lastActiveKode: null,
  setLastActiveKode: (kode) => set({ lastActiveKode: kode }),
}));
