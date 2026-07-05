/**
 * packages/shared/vitest.config.js — Config Vitest standalone untuk
 * `@deera/shared` (tidak ada `vite.config.js` sendiri di package ini karena
 * bukan app yang di-build langsung — jadi tidak ada yang perlu di-merge).
 *
 * Dijalankan lewat: `npm run test:shared` / `npm run coverage:shared`
 * (lihat root package.json) — masing-masing memanggil
 * `vitest run --config packages/shared/vitest.config.js`.
 */
import path from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      "@deera/shared": __dirname,
    },
  },
  test: {
    name: "shared",
    environment: "jsdom",
    css: true,
    setupFiles: [path.resolve(__dirname, "../../test/setup.js")],
    coverage: {
      provider: "v8",
      reportsDirectory: path.resolve(__dirname, "coverage"),
      reporter: ["text", "html", "lcov"],
      include: ["**/*.{js,jsx}"],
      exclude: [
        "**/*.{test,spec}.{js,jsx}",
        "vitest.config.js",
        "README.md",
        "**/index.js",
      ],
      thresholds: {
        statements: 85,
        branches: 78,
        functions: 80,
        lines: 88,
      },
    },
  },
});
