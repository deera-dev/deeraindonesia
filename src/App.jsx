import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Catalog from "./pages/Catalog";
import ProductDetail from "./pages/ProductDetail";
import Admin from "./pages/Admin";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* HOME → REDIRECT */}
        <Route path="/" element={<Navigate to="/catalog" replace />} />

        {/* CATALOG */}
        <Route path="/catalog" element={<Catalog />} />

        {/* PRODUCT DETAIL (BARCODE TARGET) */}
        <Route path="/catalog/:kode" element={<ProductDetail />} />

        {/* ADMIN */}
        <Route path="/admin" element={<Admin />} />

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/catalog" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
