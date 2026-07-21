import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "Quizmaster-GitHub-map/**",
    "Quizmaster-GitHub-map-bonus-battle/**",
    "Quizmaster-GitHub-map-tiktok-live/**",
    "quizmaster-live-github-20260713-redesign/**",
    "quizmaster-live-github-20260721-tiktok-live/**",
  ]),
]);

export default eslintConfig;
