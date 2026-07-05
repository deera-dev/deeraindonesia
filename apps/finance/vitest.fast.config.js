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
      name: "finance",
      environment: "jsdom",
      css: false,
      setupFiles: [path.resolve(__dirname, "../../test/setup.js")],
      pool: "forks",
      poolOptions: { forks: { singleFork: true } },
      coverage: {
        provider: "v8",
        reportsDirectory: path.resolve(__dirname, "coverage"),
        reporter: ["json-summary"],
        include: ["src/**/*.{js,jsx}"],
        exclude: ["src/**/*.{test,spec}.{js,jsx}", "src/main.jsx"],
      },
    },
  })
);
