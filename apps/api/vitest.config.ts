import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["./tests/global-setup.ts"],
    // Order matters: the first file points the environment at the test database
    // before anything under `src/` is imported and reads it.
    setupFiles: ["./tests/setup-env.ts", "./tests/setup.ts"],
    // Every test truncates the one database they share, so they take turns.
    // `isolate: false` keeps them in one process too, so the app and its
    // connection pool are built once rather than once per file.
    fileParallelism: false,
    isolate: false,
  },
});
