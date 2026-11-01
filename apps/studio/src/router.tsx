import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
} from "@tanstack/react-router";
import { LoginPage } from "./features/auth";
import { DashboardPage } from "./features/dashboard";
import ProtectedRoute from "./shared/components/ProtectedRoute";

function RootComponent() {
  return <Outlet />;
}

const rootRoute = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => <Navigate to="/" replace />,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  ),
});

const routeTree = rootRoute.addChildren([indexRoute, loginRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
