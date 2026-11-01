import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render } from "@testing-library/react";

export async function renderWithRouter({ initialPath, routes }) {
  const rootRoute = createRootRoute();

  const children = Object.entries(routes).map(([path, component]) =>
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
