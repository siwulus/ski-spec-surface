import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Use jsdom for DOM testing (React components)
    environment: "jsdom",

    // Enable global test functions (describe, it, expect)
    globals: true,

    // Setup files run before each test file
    setupFiles: ["./src/test/setup.ts"],

    // Test file patterns
    // Convention: Use *.spec.{ts,tsx} for all tests
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "tests/unit/**/*.{test,spec}.{ts,tsx}",
      "tests/integration/**/*.{test,spec}.{ts,tsx}",
    ],

    // Exclude patterns
    exclude: ["node_modules", "dist", "build", ".astro", "tests/e2e/**"],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData/**",
        "dist/",
        ".astro/",
        "tests/",
        "src/components/ui/**", // Shadcn/ui components
        "src/db/database.types.ts", // Generated types
      ],
      // Set thresholds (adjust as needed)
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },

    // TypeScript type checking
    typecheck: {
      enabled: true,
      tsconfig: "./tsconfig.json",
    },
  },

  resolve: {
    // Match Astro path aliases
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
