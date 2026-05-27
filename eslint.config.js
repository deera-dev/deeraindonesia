import js        from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals   from "globals";
import prettier  from "eslint-config-prettier";

export default [
  // Ignore folders that don't need linting
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.vercel/**",
      "**/public/**",
    ],
  },

  // Base JS rules
  js.configs.recommended,

  // React Hooks + project rules
  {
    files: ["**/*.{js,jsx}"],
    plugins: {
      "react-hooks": reactHooks,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // React Hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Code style
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "eqeqeq": ["error", "always"],
      "prefer-const": "warn",
      "no-var": "error",
    },
  },

  // Prettier - disable conflicting ESLint formatting rules
  prettier,
];
