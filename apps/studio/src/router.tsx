import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
} from "@tanstack/react-router";
import { LoginPage } from "./features/auth";
import { DashboardPage } from "./features/dashboard";
import { ModelsPage } from "./features/models";
import { PosesPage } from "./features/poses";
import { PresetsPage } from "./features/presets";
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

const modelsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/models",
  component: () => (
    <ProtectedRoute>
      <ModelsPage />
    </ProtectedRoute>
  ),
});

const posesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/poses",
  component: () => (
    <ProtectedRoute>
      <PosesPage />
    </ProtectedRoute>
  ),
});

const presetsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/presets",
  component: () => (
    <ProtectedRoute>
      <PresetsPage />
    </ProtectedRoute>
  ),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  modelsRoute,
  posesRoute,
  presetsRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
