import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Banned hook — use RR7 loaders, event handlers, or derived state instead
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "ImportDeclaration[source.value='react'] > ImportSpecifier[imported.name='useEffect']",
          message:
            "useEffect is banned. Use React Router loaders, event handlers, or derived state instead.",
        },
      ],
      // Block usage of 'any'
      "@typescript-eslint/no-explicit-any": "error",
      // Ban usage of 'unknown' type
      "@typescript-eslint/no-restricted-types": [
        "error",
        {
          types: {
            unknown: {
              message: "Use a proper type instead of 'unknown'.",
            },
          },
        },
      ],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  }
);
