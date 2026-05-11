import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Admin from "./pages/Admin";
import Catalog from "./pages/Catalog";
import History from "./pages/History";
import Login from "./pages/Login";
import ProductDetail from "./pages/ProductDetail";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* HOME → REDIRECT */}
        <Route path="/" element={<Navigate to="/catalog" replace />} />

        {/* CATALOG */}
        <Route path="/catalog" element={<Catalog />} />

        {/* PRODUCT DETAIL */}
        <Route path="/code/:kode" element={<ProductDetail />} />

        {/* LOGIN */}
        <Route path="/login" element={<Login />} />

        {/* ADMIN (protected) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />

        {/* HISTORY (protected) */}
        <Route
          path="/admin/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/catalog" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
