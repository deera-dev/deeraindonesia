import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Admin from "./pages/Admin";
import Catalog from "./pages/Catalog";
import ProductDetail from "./pages/ProductDetail";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* HOME → REDIRECT */}
        <Route path="/" element={<Navigate to="/catalog" replace />} />

        {/* CATALOG */}
        <Route path="/catalog" element={<Catalog />} />

        {/* PRODUCT DETAIL (BARCODE TARGET) */}
        <Route path="/code/:kode" element={<ProductDetail />} />

        {/* ADMIN */}
        <Route path="/admin" element={<Admin />} />

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/catalog" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
