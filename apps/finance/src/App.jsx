import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Karyawan from "./pages/Karyawan";
import Gajian from "./pages/Gajian";
import GajianDetail from "./pages/GajianDetail";
import Kas from "./pages/Kas";
import Kasbon from "./pages/Kasbon";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          index
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/karyawan"
          element={
            <ProtectedRoute>
              <Karyawan />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gajian"
          element={
            <ProtectedRoute>
              <Gajian />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gajian/:id"
          element={
            <ProtectedRoute>
              <GajianDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/kas"
          element={
            <ProtectedRoute>
              <Kas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/kasbon"
          element={
            <ProtectedRoute>
              <Kasbon />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
