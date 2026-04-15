import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        include: [
            "src/**/__tests__/**/*.?(c|m)[jt]s?(x)",
            "src/**/*.{test,spec}.?(c|m)[jt]s?(x)",
        ],
    },
});
