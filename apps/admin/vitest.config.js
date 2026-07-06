/**
 * apps/admin/vitest.config.js — `mergeConfig` dengan `vite.config.js` asli
 * app ini supaya alias (`@deera/shared`, dst) identik dengan build
 * sesungguhnya. Dijalankan lewat `npm run test:admin` / `coverage:admin`
 * di root package.json (`vitest run --config apps/admin/vitest.config.js`).
 */
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default mergeConfig(
  viteConfig,
  defineConfig({
    root: __dirname,
    test: {
      name: "admin",
      environment: "jsdom",
      css: true,
      setupFiles: [path.resolve(__dirname, "../../test/setup.js")],
      coverage: {
        provider: "v8",
        reportsDirectory: path.resolve(__dirname, "coverage"),
        reporter: ["text", "html", "lcov"],
        include: ["src/**/*.{js,jsx}"],
        exclude: [
          "src/**/*.{test,spec}.{js,jsx}",
          "src/main.jsx",
          // Barrel re-export files — coverage depends on which exports consumers
          // use, not on logic inside the file; excluding is standard practice.
          "src/**/index.js",
        ],
        thresholds: {
          statements: 80,
          branches: 72,
          functions: 74,
          lines: 80,
        },
      },
    },
  })
);
