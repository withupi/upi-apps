import { copyFile } from "node:fs/promises";

import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true,
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  // targets.json is bundled into the JS by the import in links.ts; this copy is
  // the separate `@withupi/upi-apps/targets.json` subpath export, for tooling
  // that reads the table directly (Expo config plugins, codegen) rather than
  // going through the API.
  onSuccess: async () => {
    await copyFile("src/targets.json", "dist/targets.json");
  },
  sourcemap: true,
  target: "es2020",
  treeshake: true,
});
