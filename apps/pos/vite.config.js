import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { appVersionPlugin } from "../../packages/shared/lib/versionPlugin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), appVersionPlugin()],
  envDir: path.resolve(__dirname, "../../"),
  resolve: {
    alias: {
      "@deera/shared": path.resolve(__dirname, "../../packages/shared"),
      "iconv-lite": path.resolve(__dirname, "src/stubs/iconv-lite.js"),
    },
  },
  server: { host: true },
  build: { emptyOutDir: false },
});
