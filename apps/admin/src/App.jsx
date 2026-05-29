import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Admin from "./pages/Admin";
import History from "./pages/History";
import Transfer from "./pages/Transfer";
import StokOpname from "./pages/StokOpname";
import BukuPotongan from "./pages/BukuPotongan";
import Login from "./pages/Login";
import ProduksiBahan from "./pages/ProduksiBahan";
import ProduksiRecord from "./pages/ProduksiRecord";
import ProduksiHPP from "./pages/ProduksiHPP";
import ProduksiLaporan from "./pages/ProduksiLaporan";
import ProduksiSampel from "./pages/ProduksiSampel";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          index
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transfer"
          element={
            <ProtectedRoute>
              <Transfer />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stok-opname"
          element={
            <ProtectedRoute>
              <StokOpname />
            </ProtectedRoute>
          }
        />
        <Route
          path="/buku-potongan"
          element={
            <ProtectedRoute>
              <BukuPotongan />
            </ProtectedRoute>
          }
        />

        {/* Modul Produksi */}
        <Route path="/produksi" element={<Navigate to="/produksi/bahan" replace />} />
        <Route
          path="/produksi/bahan"
          element={
            <ProtectedRoute>
              <ProduksiBahan />
            </ProtectedRoute>
          }
        />
        <Route
          path="/produksi/record"
          element={
            <ProtectedRoute>
              <ProduksiRecord />
            </ProtectedRoute>
          }
        />
        <Route
          path="/produksi/hpp"
          element={
            <ProtectedRoute>
              <ProduksiHPP />
            </ProtectedRoute>
          }
        />
        <Route
          path="/produksi/laporan"
          element={
            <ProtectedRoute>
              <ProduksiLaporan />
            </ProtectedRoute>
          }
        />

        <Route
          path="/produksi/sampel"
          element={
            <ProtectedRoute>
              <ProduksiSampel />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
