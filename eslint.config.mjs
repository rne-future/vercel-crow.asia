import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  { ignores: [".next*/**", "node_modules/**", "dist/**", "coverage/**"] },
  ...compat.extends("next/core-web-vitals"),
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{
        group: ["@/lib/db", "@/lib/db/*", "drizzle-orm", "drizzle-orm/*", "@/lib/modules/*/*.repository"],
        message: "Routing and UI must call a domain service; database access belongs in repositories.",
      }] }],
    },
  },
];

export default eslintConfig;
