import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { CatalogPage } from "./features/product-catalog";
import { ProductDetailPage } from "./features/product-detail";
import { FavoritesPage } from "./features/favorites";
import { usePageTracking } from "./features/analytics";

function RouteTracker() {
  usePageTracking();
  return null;
}

// QR di label produk memakai /q/KODE (lebih pendek → QR lebih mudah dibaca). Dialihkan ke halaman
// produk; pelacakan mencatat kunjungan ini sebagai sumber "QR produk" (lihat features/analytics).
function QrRedirect() {
  const { kode } = useParams();
  return <Navigate to={`/code/${encodeURIComponent(kode)}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <RouteTracker />
      <Routes>
        <Route path="/" element={<Navigate to="/catalog" replace />} />
        <Route path="/q/:kode" element={<QrRedirect />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/code/:kode" element={<ProductDetailPage />} />
        <Route path="/favorit" element={<FavoritesPage />} />
        <Route path="*" element={<Navigate to="/catalog" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
