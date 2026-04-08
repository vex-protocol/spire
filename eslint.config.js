import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
    // Start with recommended-type-checked (not strict) for spire.
    // Spire has extensive `any` usage in Express route handlers and
    // msgpack decoding. These will be fixed when Zod validation is
    // added to routes (beads-at4 phase 5). Upgrade to strictTypeChecked then.
    ...tseslint.configs.recommendedTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            // Allow any for now — too many instances to fix in compliance gate.
            // Will be eliminated when Zod is added to route handlers.
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-unsafe-assignment": "warn",
            "@typescript-eslint/no-unsafe-member-access": "warn",
            "@typescript-eslint/no-unsafe-argument": "warn",
            "@typescript-eslint/no-unsafe-call": "warn",
            "@typescript-eslint/no-unsafe-type-assertion": "warn",
            "@typescript-eslint/no-unsafe-return": "warn",
            "@typescript-eslint/no-floating-promises": "warn",
            "@typescript-eslint/require-await": "warn",
            "@typescript-eslint/restrict-plus-operands": "warn",
            "@typescript-eslint/no-misused-promises": "warn",
            "@typescript-eslint/no-unused-vars": "warn",
            "@typescript-eslint/prefer-promise-reject-errors": "warn",
            "@typescript-eslint/no-unnecessary-type-assertion": "warn",

            "@typescript-eslint/consistent-type-imports": [
                "error",
                {
                    prefer: "type-imports",
                    fixStyle: "inline-type-imports",
                },
            ],
            "@typescript-eslint/consistent-type-exports": "error",
            "@typescript-eslint/no-import-type-side-effects": "error",
        },
    },
    eslintConfigPrettier,
);
