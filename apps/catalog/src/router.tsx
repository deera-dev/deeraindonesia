import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { usePageTracking } from "./features/analytics";
import { FavoritesPage } from "./features/favorites";
import { CatalogPage } from "./features/product-catalog";
import { ProductDetailPage } from "./features/product-detail";

function RootComponent() {
  usePageTracking();
  return <Outlet />;
}

const rootRoute = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => <Navigate to="/catalog" replace />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/catalog" });
  },
});

const qrRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/q/$kode",
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/code/$kode", params: { kode: params.kode } });
  },
});

const strukRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/s",
  beforeLoad: () => {
    throw redirect({ to: "/catalog" });
  },
});

const kartuJahitRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/j/$id",
  beforeLoad: () => {
    throw redirect({ to: "/catalog" });
  },
});

const shortLinkRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/t/$code",
  beforeLoad: () => {
    throw redirect({ to: "/catalog" });
  },
});

const catalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/catalog",
  component: CatalogPage,
});

const productDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/code/$kode",
  component: ProductDetailPage,
});

const favoritRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/favorit",
  component: FavoritesPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  qrRoute,
  strukRoute,
  kartuJahitRoute,
  shortLinkRoute,
  catalogRoute,
  productDetailRoute,
  favoritRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
