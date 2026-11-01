import { useAuth } from "@deera/shared/features/auth/hooks";
import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
