import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./shared/components/ProtectedRoute";
import { LoginPage } from "./features/auth";
import { DashboardPage } from "./features/dashboard";
import { KaryawanPage } from "./features/karyawan";
import { GajianListPage, GajianDetailPage } from "./features/gajian";
import { KasbonPage } from "./features/kasbon";
import { PettycashPage } from "./features/pettycash";
import { PengaturanPage } from "./features/pengaturan";

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
