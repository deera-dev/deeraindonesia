import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AnalyticsPage } from "./features/analytics";
import { LoginPage } from "./features/auth";
import { BukuPotonganPage } from "./features/buku-potongan";
import { CalonCustomerPage } from "./features/calon-customer";
import { HistoryPage } from "./features/history";
import { TokoPage } from "./features/ngorder";
import { NotifikasiPage } from "./features/notifikasi";
import { PasarRestockPage } from "./features/pasar-restock";
import { PelangganPage } from "./features/pelanggan";
import { AdminPage } from "./features/produk";
import { ProduksiBahanPage } from "./features/produksi-bahan";
import { ProduksiHPPPage } from "./features/produksi-hpp";
import { ProduksiJahitPage } from "./features/produksi-jahit";
import { ProduksiRecordPage } from "./features/produksi-record";
import { ProduksiSampelPage } from "./features/produksi-sampel";
import { StokOpnamePage } from "./features/stok-opname";
import { TrafikKatalogPage } from "./features/trafik-katalog";
import { TransferPage } from "./features/transfer";
import ProtectedRoute from "./shared/components/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          index
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trafik"
          element={
            <ProtectedRoute>
              <TrafikKatalogPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifikasi"
          element={
            <ProtectedRoute>
              <NotifikasiPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transfer"
          element={
            <ProtectedRoute>
              <TransferPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stok-opname"
          element={
            <ProtectedRoute>
              <StokOpnamePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/buku-potongan"
          element={
            <ProtectedRoute>
              <BukuPotonganPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pelanggan"
          element={
            <ProtectedRoute>
              <PelangganPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pasar-restock"
          element={
            <ProtectedRoute>
              <PasarRestockPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/calon-customer"
          element={
            <ProtectedRoute>
              <CalonCustomerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ngorder"
          element={
            <ProtectedRoute>
              <TokoPage />
            </ProtectedRoute>
          }
        />

        <Route path="/produksi" element={<Navigate to="/produksi/sampel" replace />} />
        <Route
          path="/produksi/bahan"
          element={
            <ProtectedRoute>
              <ProduksiBahanPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/produksi/record"
          element={
            <ProtectedRoute>
              <ProduksiRecordPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/produksi/hpp"
          element={
            <ProtectedRoute>
              <ProduksiHPPPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/produksi/sampel"
          element={
            <ProtectedRoute>
              <ProduksiSampelPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/produksi/jahit"
          element={
            <ProtectedRoute>
              <ProduksiJahitPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
