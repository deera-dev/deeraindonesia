export { default as PelangganPage } from "./pages/PelangganPage";
export {
  usePelanggan,
  searchPelanggan,
  addPelanggan,
  updatePelanggan,
  deletePelanggan,
  useSalesByPelanggan,
} from "./hooks";

// PelangganRiwayatModal di-export SENGAJA — dipakai fitur `laporan`
// (SaleCard) supaya tap nama pembeli di kartu transaksi bisa langsung buka
// riwayat pembelian orang itu, baik yang sudah terdaftar (pelanggan_id)
// maupun yang belum (cocok by nama, lihat api.js). Reuse lintas fitur lewat
// index.js (Dependency Inversion, CLAUDE.md §7), sama pola dgn ReturModal
// yang di-export dari features/laporan/index.js.
export { default as PelangganRiwayatModal } from "./components/PelangganRiwayatModal";
