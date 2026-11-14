import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Contrôle du contenu exporté des fiches : npm run contenu:verifier
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)), "server-only": fileURLToPath(new URL("./tests/outils/server-only.ts", import.meta.url)) } },
  test: { include: ["tests/contenu/**/*.test.ts"], environment: "node", testTimeout: 120_000 },
});
