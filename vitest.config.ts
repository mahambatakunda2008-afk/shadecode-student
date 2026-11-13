import { configDefaults, defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Next.js server-only guard throws outside the Next server runtime; Vitest runs in Node.
      "server-only": path.resolve(__dirname, "./src/test/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    // Playwright specs (e2e/**) run under `npm run test:e2e`, not vitest.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
