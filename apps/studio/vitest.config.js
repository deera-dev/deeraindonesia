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
      name: "studio",
      environment: "jsdom",
      css: true,
      setupFiles: [path.resolve(__dirname, "../../test/setup.js")],
      coverage: {
        provider: "v8",
        reportsDirectory: path.resolve(__dirname, "coverage"),
        reporter: ["text", "html", "lcov"],
        include: ["src/**/*.{js,jsx,ts,tsx}"],
        exclude: ["src/**/*.{test,spec}.{js,jsx,ts,tsx}", "src/main.tsx", "src/**/index.ts"],
      },
    },
  }),
);
