import CalonCustomerList from "./CalonCustomerList";
import AdminBottomNav from "../../../shared/components/AdminBottomNav";
import AdminSidebar from "../../../shared/components/AdminSidebar";

export default function CalonCustomerPage() {
  return (
    <div className="min-h-screen bg-skin-page pb-24 md:pb-6 md:pl-64">
      <div className="px-4 pt-6 pb-4 md:px-8 xl:px-10 2xl:px-12">
        <h1 className="font-headline text-2xl text-skin-text">Calon Customer</h1>
        <p className="text-sm text-skin-text3 mt-1">
          Daftar prospek yang belum pernah bertransaksi — dipakai sebagai target fitur Blast. Kini
          juga bisa diakses lewat tab "Calon" di halaman Pelanggan.
        </p>
      </div>

      <div className="px-4 md:px-8 xl:px-10 2xl:px-12">
        <CalonCustomerList />
      </div>

      <AdminSidebar />
      <AdminBottomNav />
    </div>
  );
}
