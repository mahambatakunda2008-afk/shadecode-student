import { configDefaults, defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    // Playwright specs (e2e/**) run under `npm run test:e2e`, not vitest.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
