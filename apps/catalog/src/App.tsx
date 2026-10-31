import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { usePageTracking } from "./features/analytics";
import { FavoritesPage } from "./features/favorites";
import { CatalogPage } from "./features/product-catalog";
import { ProductDetailPage } from "./features/product-detail";

function RouteTracker() {
  usePageTracking();
  return null;
}

function QrRedirect() {
  const { kode = "" } = useParams();
  return <Navigate to={`/code/${encodeURIComponent(kode)}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <RouteTracker />
      <Routes>
        <Route path="/" element={<Navigate to="/catalog" replace />} />
        <Route path="/q/:kode" element={<QrRedirect />} />
        <Route path="/s" element={<Navigate to="/catalog" replace />} />
        <Route path="/j/:id" element={<Navigate to="/catalog" replace />} />
        <Route path="/t/:code" element={<Navigate to="/catalog" replace />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/code/:kode" element={<ProductDetailPage />} />
        <Route path="/favorit" element={<FavoritesPage />} />
        <Route path="*" element={<Navigate to="/catalog" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
