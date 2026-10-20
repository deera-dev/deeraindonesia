import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

export function appVersionPlugin() {
  const version = Date.now().toString(36);

  return {
    name: "deera-app-version",
    config() {
      return {
        define: {
          "import.meta.env.VITE_APP_VERSION": JSON.stringify(version),
        },
      };
    },
    writeBundle(options) {
      const dir = options.dir ?? resolve(process.cwd(), "dist");
      writeFileSync(resolve(dir, "version.json"), JSON.stringify({ version }));
    },
  };
}
