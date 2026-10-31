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
          "src/shared/hooks/useTsplPrinter.js",
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
  }),
);
