import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./shared/components/ProtectedRoute";
import { LoginPage } from "./features/auth";
import { AdminPage } from "./features/produk";
import { HistoryPage } from "./features/history";
import { TransferPage } from "./features/transfer";
import { StokOpnamePage } from "./features/stok-opname";
import { BukuPotonganPage } from "./features/buku-potongan";
import { ProduksiBahanPage } from "./features/produksi-bahan";
import { ProduksiRecordPage } from "./features/produksi-record";
import { ProduksiHPPPage } from "./features/produksi-hpp";
import { ProduksiLaporanPage } from "./features/produksi-laporan";
import { ProduksiSampelPage } from "./features/produksi-sampel";
import { AnalyticsPage } from "./features/analytics";

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

        {/* Modul Produksi */}
        <Route path="/produksi" element={<Navigate to="/produksi/bahan" replace />} />
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
          path="/produksi/laporan"
          element={
            <ProtectedRoute>
              <ProduksiLaporanPage />
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
