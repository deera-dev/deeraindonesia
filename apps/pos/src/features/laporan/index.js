export { default as LaporanPage } from "./pages/LaporanPage";

// ReturModal di-export SENGAJA — dipakai fitur `pelanggan` (modal riwayat
// pembelian) untuk memicu Retur langsung dari hasil pencarian transaksi
// lama by pelanggan, tanpa harus pindah ke tab Transaksi di Laporan.
// Reuse komponen LINTAS FITUR lewat index.js (bukan import langsung ke
// components/ReturModal.jsx) — sesuai Dependency Inversion CLAUDE.md §7.
export { default as ReturModal } from "./components/ReturModal";

// Dipakai PosBottomNav: label + ikon tab ikut sub-tab yang sedang dipilih.
export { useLaporanSubTab } from "./hooks";
