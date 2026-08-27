import { defineConfig } from "tsup";

// Only JavaScript is emitted. `package.json` points `types` at `src/index.ts`,
// so TypeScript reads the real source — the inference is exact and nothing has
// to be built before a type-check. Node reads `dist/index.js`, which is the
// half that matters: a package consumed by a Node runtime cannot ship `.ts`.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  // Not `node24`: this package is isomorphic — the play app ships it to a
  // browser — so it must not be downlevelled against one runtime's syntax.
  target: "es2022",
  clean: true,
});
