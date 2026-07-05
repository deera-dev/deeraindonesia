/**
 * apps/pos/vitest.config.js — `mergeConfig` dengan `vite.config.js` asli
 * app ini supaya alias (`@deera/shared`, `iconv-lite` stub, dst) identik
 * dengan build sesungguhnya. Dijalankan lewat `npm run test:pos` /
 * `coverage:pos` di root package.json
 * (`vitest run --config apps/pos/vitest.config.js`).
 *
 * CATATAN: project ini juga menguji inti offline-sync (lib/db.js, lib/sync.js,
 * hooks/useProducts.js) yang memakai Dexie — `fake-indexeddb/auto` diimpor di
 * `test/setup.js` global sehingga `indexedDB` tersedia di jsdom tanpa
 * menyentuh source code Dexie itu sendiri (lihat CLAUDE.md §7/§13 — bagian
 * ini SENGAJA tidak di-refactor, dan tidak boleh diubah implementasinya
 * untuk kebutuhan testing).
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
      name: "pos",
      environment: "jsdom",
      css: true,
      setupFiles: [
        path.resolve(__dirname, "../../test/setup.js"),
        path.resolve(__dirname, "../../test/setup.indexeddb.js"),
      ],
      coverage: {
        provider: "v8",
        reportsDirectory: path.resolve(__dirname, "coverage"),
        reporter: ["text", "html", "lcov"],
        include: ["src/**/*.{js,jsx}"],
        exclude: [
          "src/**/*.{test,spec}.{js,jsx}",
          "src/main.jsx",
          "src/**/index.js",
          // Bluetooth/USB thermal-printer driver — hardware APIs unavailable in jsdom
          "src/shared/hooks/useTsplPrinter.js",
          // Web Push subscription — ServiceWorker + PushManager not in jsdom
          "src/shared/hooks/usePushSubscription.js",
        ],
        thresholds: {
          statements: 70,
          branches: 57,
          functions: 62,
          lines: 73,
        },
      },
    },
  })
);
