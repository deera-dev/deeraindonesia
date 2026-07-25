import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { CatalogPage } from "./features/product-catalog";
import { ProductDetailPage } from "./features/product-detail";
import { FavoritesPage } from "./features/favorites";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/catalog" replace />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/code/:kode" element={<ProductDetailPage />} />
        <Route path="/favorit" element={<FavoritesPage />} />
        <Route path="*" element={<Navigate to="/catalog" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
