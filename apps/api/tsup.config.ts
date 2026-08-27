import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  target: "node24",
  clean: true,
  // The shared package ships TypeScript source, so it has to be bundled in
  // rather than left as a runtime import.
  noExternal: ["@wordlex/domain"],
});
