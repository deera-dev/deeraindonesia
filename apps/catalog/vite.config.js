import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  // Baca .env dari root monorepo (bukan dari folder app ini)
  envDir: path.resolve(__dirname, "../../"),
  resolve: {
    alias: {
      "@deera/shared": path.resolve(__dirname, "../../packages/shared"),
    },
  },
  server: { host: true },
});
