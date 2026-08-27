# React Compiler in both apps

Both frontends compile with React Compiler, so memoisation is the build's job
rather than something we hand-write with `useMemo` and `memo`. React is 19.2, so
the runtime it needs already ships inside React; nothing extra is installed for it.

The two apps enable it differently, because their build tools differ:

- **`apps/play`** uses `@vitejs/plugin-react`'s own `compiler: true`, which runs the
  compiler through **oxc** rather than Babel. No Babel in the build at all, which
  matters because the pre-push hook builds and oxc is much faster. It is marked
  experimental in the plugin, and that is the risk we take.
- **`apps/landing`** uses Next's `reactCompiler: true`, which does route through
  Babel.

## What we verified, because a flag like this can silently do nothing

With the flag on, `Home` in `apps/play` compiles to `const $ = c(20)` — a twenty
slot memo cache. With it off, the same component comes out untouched. In
`apps/landing` a throwaway client component compiled to the array-cache form with
the flag on and not without it.

Three things that surprised us and are worth knowing before someone re-checks:

- The compiled marker does not survive minification under the name you would grep
  for. Look for the string `react.memo_cache_sentinel`, or build unminified.
- Nothing in `apps/landing` is compiled today. Its components are Server
  Components rendering static JSX, so the compiler correctly has nothing to do.
  The flag is there for the client components that will arrive.
- In `apps/play` the client build is compiled and the SSR build is not. Both render
  the same HTML, so this is a missed optimisation rather than a hydration risk.

## The costs

An extra transform on every React file in every build, and a compiler that can
change *when* a component re-renders. If a component ever misbehaves in a way that
smells like stale state, turning the flag off for that app is the first diagnostic.

The `eslint-plugin-react-compiler` rules, which catch code the compiler has to bail
out on, are not installed: this repo lints with oxlint, not ESLint, and oxlint has
no equivalent rules today.
