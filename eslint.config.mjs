// Native flat config. eslint-config-next 16 ships `Linter.Config[]` arrays,
// so we spread them directly instead of the legacy FlatCompat bridge, which
// crashed @eslint/eslintrc's config-validator on the circular react plugin.
// Both arrays share the same @typescript-eslint plugin instance (no redefine
// conflict); `typescript` adds the 20 recommended TS rules that
// core-web-vitals only registers the plugin for.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
