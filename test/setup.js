/**
 * test/setup.js — Setup global untuk SEMUA project Vitest (shared, catalog,
 * admin, pos, finance). Didaftarkan lewat `test.setupFiles` di tiap
 * vitest.config.js. Tidak pakai `test.globals: true` di config manapun —
 * setiap file test mengimpor describe/it/expect/vi secara eksplisit dari
 * "vitest", supaya tidak perlu ubah eslint config (no-undef tetap aman).
 */
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

if (typeof window !== "undefined") {
  window.scrollTo = vi.fn();
}

if (typeof window !== "undefined" && !window.IntersectionObserver) {
  window.IntersectionObserver = class IntersectionObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    constructor(_callback, _options) {}
  };
}

if (typeof window !== "undefined" && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    constructor(_callback) {}
  };
}

if (typeof URL !== "undefined" && !URL.createObjectURL) {
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
}
