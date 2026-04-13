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
      // Pre-existing issues — not in scope for this enforcement pass
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  }
);
