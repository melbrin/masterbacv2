import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)), "server-only": fileURLToPath(new URL("./tests/outils/server-only.ts", import.meta.url)) } },
  test: {
    include: ["tests/unitaires/**/*.test.ts", "tests/moteur/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["lib/moteur/**", "lib/commun/**", "lib/serveur/acces.ts"],
      thresholds: { "lib/moteur/**": { lines: 95, branches: 95 } },
    },
  },
});
