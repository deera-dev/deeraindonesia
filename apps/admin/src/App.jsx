import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute  from "./components/ProtectedRoute";
import Admin           from "./pages/Admin";
import History         from "./pages/History";
import Transfer        from "./pages/Transfer";
import StokOpname      from "./pages/StokOpname";
import BukuPotongan    from "./pages/BukuPotongan";
import Login           from "./pages/Login";
import ProduksiBahan   from "./pages/ProduksiBahan";
import ProduksiRecord  from "./pages/ProduksiRecord";
import ProduksiHPP     from "./pages/ProduksiHPP";
import ProduksiLaporan from "./pages/ProduksiLaporan";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/login" element={<Login />} />

        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path="/admin/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="/admin/transfer" element={<ProtectedRoute><Transfer /></ProtectedRoute>} />
        <Route path="/admin/stok-opname" element={<ProtectedRoute><StokOpname /></ProtectedRoute>} />
        <Route path="/admin/buku-potongan" element={<ProtectedRoute><BukuPotongan /></ProtectedRoute>} />

        {/* Modul Produksi */}
        <Route path="/admin/produksi" element={<Navigate to="/admin/produksi/bahan" replace />} />
        <Route path="/admin/produksi/bahan" element={<ProtectedRoute><ProduksiBahan /></ProtectedRoute>} />
        <Route path="/admin/produksi/record" element={<ProtectedRoute><ProduksiRecord /></ProtectedRoute>} />
        <Route path="/admin/produksi/hpp" element={<ProtectedRoute><ProduksiHPP /></ProtectedRoute>} />
        <Route path="/admin/produksi/laporan" element={<ProtectedRoute><ProduksiLaporan /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
