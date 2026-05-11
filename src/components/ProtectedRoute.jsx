import { Navigate } from "react-router-dom";
import { isAdminAuth } from "../lib/auth";

export default function ProtectedRoute({ children }) {
  if (!isAdminAuth()) return <Navigate to="/login" replace />;
  return children;
}
