import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Admin    from "./pages/Admin";
import History  from "./pages/History";
import Transfer from "./pages/Transfer";
import Login    from "./pages/Login";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/admin"
          element={<ProtectedRoute><Admin /></ProtectedRoute>}
        />
        <Route
          path="/admin/history"
          element={<ProtectedRoute><History /></ProtectedRoute>}
        />
        <Route
          path="/admin/transfer"
          element={<ProtectedRoute><Transfer /></ProtectedRoute>}
        />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
