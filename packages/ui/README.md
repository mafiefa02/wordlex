# @wordlex/ui

The design system: colour and type tokens, the `cn` helper, and every shadcn/ui
component. Both apps import it, so there is one palette rather than one per app
(ADR 0016).

```sh
pnpm dlx shadcn@latest add button -c packages/ui
```

Components land in `src/components/` and are ours to edit. Run that command from
the repo root, never inside an app.

`src/styles/globals.css` holds the tokens. The neutrals, the green ramp and the
four language hues were validated for both themes in ADR 0014 — change them with
contrast numbers in hand, not by eye. The three Marks (`exact`, `present`,
`absent`) are stepped by lightness so they survive greyscale.

Theme follows the operating system with no JavaScript; `data-theme` on `<html>`
overrides it. The dark palette is written twice — the two blocks must stay in step.
