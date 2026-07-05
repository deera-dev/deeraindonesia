/**
 * test/utils.jsx — Shared test utilities for all apps/packages in the monorepo.
 * Exports helper functions used by hooks.test.js and queries.test.js.
 */
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Factory that returns a wrapper component for use with renderHook({ wrapper }).
 * Creates a fresh QueryClient per call so tests are isolated.
 */
export function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}
