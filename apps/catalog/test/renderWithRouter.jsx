import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render } from "@testing-library/react";

function Placeholder({ label }) {
  return <div>{label}</div>;
}

const DEFAULT_ROUTES = {
  "/": () => <Placeholder label="ROOT-PLACEHOLDER" />,
  "/catalog": () => <Placeholder label="CATALOG-PLACEHOLDER" />,
  "/code/$kode": () => <Placeholder label="DETAIL-PLACEHOLDER" />,
  "/favorit": () => <Placeholder label="FAVORIT-PLACEHOLDER" />,
};

export async function renderWithRouter({ initialPath, routes = {} }) {
  const rootRoute = createRootRoute();
  const merged = { ...DEFAULT_ROUTES, ...routes };

  const children = Object.entries(merged).map(([path, component]) =>
    createRoute({ getParentRoute: () => rootRoute, path, component }),
  );

  const routeTree = rootRoute.addChildren(children);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });

  await router.load();
  return render(<RouterProvider router={router} />);
}
