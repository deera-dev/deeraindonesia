import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, "../../"),
  resolve: {
    alias: {
      "@deera/shared": path.resolve(__dirname, "../../packages/shared"),
    },
  },
  server: { host: true },
  build: { emptyOutDir: false },
});
