import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      {
        test: {
          name: "core",
          root: "./packages/core",
          include: ["tests/**/*.test.ts"],
          passWithNoTests: true,
        },
      },
      {
        test: {
          name: "db",
          root: "./packages/db",
          include: ["tests/**/*.test.ts"],
          passWithNoTests: true,
        },
      },
      {
        test: {
          name: "cli",
          root: "./apps/cli",
          include: ["tests/**/*.test.ts"],
          passWithNoTests: true,
        },
      },
    ],
  },
});
