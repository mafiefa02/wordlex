# @wordlex/ui

The design system: colour and type tokens, the `cn` helper, and every shadcn/ui
component. Both apps import it, so there is one palette rather than one per app
(ADR 0016).

```sh
pnpm dlx shadcn@latest add button -c packages/ui
```

Components land in `src/components/` and are ours to edit. Run that command from
the repo root, never inside an app.

Not everything here came from shadcn. `logo`, `theme-toggle` and `sign-in-panel`
are ours, and they are here for the same reason: both apps render them and the
two must not drift. They take what differs between the apps as a prop — a cookie
domain, a way to start a sign-in — because this package may not read either
app's environment.

`src/styles/globals.css` holds the tokens. The neutrals, the green ramp and the
four language hues were validated for both themes in ADR 0014 — change them with
contrast numbers in hand, not by eye. The three Marks (`exact`, `present`,
`absent`) are stepped by lightness so they survive greyscale.

Theme follows the operating system with no JavaScript; `data-theme` on `<html>`
overrides it. The dark palette is written twice — the two blocks must stay in step.
