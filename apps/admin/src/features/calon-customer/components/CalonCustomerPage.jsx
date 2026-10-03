/**
 * CalonCustomerPage.jsx — halaman standalone lama (`/calon-customer`).
 * Permintaan Denny 2026-10 ("pelanggan dan calon digabungin aja jadi 1
 * halaman, bisa dipisah dengan tab") memindahkan tab "Calon" jadi bagian
 * dari PelangganPage.jsx (lihat features/pelanggan) — halaman INI
 * dipertahankan (tidak dihapus, link lama/bookmark tetap jalan) tapi SUDAH
 * TIDAK diiklankan lagi di nav (lihat AdminBottomNav.jsx NAV_ITEMS). Isinya
 * sekarang cuma delegasi ke CalonCustomerList (satu sumber UI, tidak ada
 * CRUD duplikat).
 */
import CalonCustomerList from "./CalonCustomerList";
import AdminBottomNav from "../../../shared/components/AdminBottomNav";
import AdminSidebar from "../../../shared/components/AdminSidebar";

export default function CalonCustomerPage() {
  return (
    <div className="min-h-screen bg-skin-page pb-24 md:pb-6 md:pl-64">
      <div className="px-4 pt-6 pb-4">
        <h1 className="font-headline text-2xl text-skin-text">Calon Customer</h1>
        <p className="text-sm text-skin-text3 mt-1">
          Daftar prospek yang belum pernah bertransaksi — dipakai sebagai target fitur Blast. Kini
          juga bisa diakses lewat tab "Calon" di halaman Pelanggan.
        </p>
      </div>

      <div className="px-4">
        <CalonCustomerList />
      </div>

      <AdminSidebar />
      <AdminBottomNav />
    </div>
  );
}
