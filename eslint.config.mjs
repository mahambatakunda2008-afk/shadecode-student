import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      // Existing client components intentionally use effects to synchronize
      // remote/local state. These rules are currently too aggressive for that
      // architecture and produce false positives on valid event/effect flows.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      // Node-side ingestion/Cortex scripts use CommonJS for runtime portability.
      "@typescript-eslint/no-require-imports": "off",
      "prefer-const": "off",
      "react/no-unescaped-entities": "off",
    },
  },
]);

export default eslintConfig;
