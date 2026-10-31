import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./features/auth";
import { DashboardPage } from "./features/dashboard";
import { GajianDetailPage, GajianListPage } from "./features/gajian";
import { KaryawanPage } from "./features/karyawan";
import { KasbonPage } from "./features/kasbon";
import { PengaturanPage } from "./features/pengaturan";
import { PettycashPage } from "./features/pettycash";
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
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/karyawan"
          element={
            <ProtectedRoute>
              <KaryawanPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gajian"
          element={
            <ProtectedRoute>
              <GajianListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gajian/:id"
          element={
            <ProtectedRoute>
              <GajianDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/kasbon"
          element={
            <ProtectedRoute>
              <KasbonPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pettycash"
          element={
            <ProtectedRoute>
              <PettycashPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pengaturan"
          element={
            <ProtectedRoute>
              <PengaturanPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
