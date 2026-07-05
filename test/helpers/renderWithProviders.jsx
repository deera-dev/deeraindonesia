/**
 * test/helpers/renderWithProviders.jsx — Helper render React Testing Library
 * yang membungkus komponen dengan provider yang biasanya sudah ada di
 * `main.jsx` tiap app (QueryClientProvider) dan/atau router (MemoryRouter,
 * dipakai komponen yang memanggil `useNavigate`/`<Link>`/`<NavLink>`/dst).
 */
import { render } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { createTestQueryClient } from "./queryClient";

/**
 * Render dengan QueryClientProvider + MemoryRouter. Dipakai untuk komponen
 * Page yang memanggil hooks.js (queries.js) dan/atau React Router.
 */
export function renderWithProviders(
  ui,
  { route = "/", initialEntries, queryClient = createTestQueryClient(), ...renderOptions } = {}
) {
  function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries ?? [route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }
  return { queryClient, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

/** Render dengan QueryClientProvider saja (tanpa router) — untuk komponen non-route. */
export function renderWithQueryClient(ui, { queryClient = createTestQueryClient(), ...renderOptions } = {}) {
  function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

/** Wrapper polos (factory) untuk dipakai langsung di `renderHook(fn, { wrapper })`. */
export function createQueryWrapper(queryClient = createTestQueryClient()) {
  return function Wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}
