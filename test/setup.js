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

// Bersihkan DOM yang dirender RTL setelah setiap test, supaya antar test
// tidak saling "bocor" elemen.
afterEach(() => {
  cleanup();
});

// matchMedia tidak ada di jsdom — beberapa komponen (dark mode, dsb) bisa
// memanggil ini secara tidak langsung lewat lib pihak ketiga.
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

// jsdom modern MENYEDIAKAN window.scrollTo sebagai stub "not implemented"
// (bukan undefined), jadi guard `!window.scrollTo` tidak pernah terpenuhi dan
// pemanggilan asli tetap lewat (warning di console, bukan spy). Override
// TANPA SYARAT supaya selalu jadi vi.fn() yang bisa di-assert komponen
// seperti BackToTop.
if (typeof window !== "undefined") {
  window.scrollTo = vi.fn();
}

// IntersectionObserver tidak ada di jsdom — dipakai beberapa komponen
// untuk lazy-load / scroll-snap detection.
if (typeof window !== "undefined" && !window.IntersectionObserver) {
  window.IntersectionObserver = class IntersectionObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  };
}
