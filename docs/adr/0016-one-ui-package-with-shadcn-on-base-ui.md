# One UI package, shadcn/ui on Base UI, and a palette carried by lightness

> **Amended 2026-08-28.** The shadcn slot tokens are now shadcn's own zinc
> default: neutral greys, and a `--primary` that is near black in light and near
> white in dark. Everything below about *where* the palette lives still holds —
> one package, one set of tokens, both apps. What changed is that the green from
> ADR 0014's mock is no longer the brand colour.
>
> The reason is that the green competed with the four language hues. Those hues
> are the product, and the brand mark is made of them, so the chrome around them
> should be quiet. Neutral chrome makes them the only saturated thing on screen.
>
> `--lang-en/id/su/jv`, the `--level-0..4` ramp and the three Mark pairs are
> **unchanged**, so ADR 0014's validation and the Mark lightness steps below
> still stand. Two loose ends this leaves: `--level-0` and `--absent` were picked
> against the old green-tinted greys and now read slightly warm beside zinc.
> Nothing renders either one yet, so re-tuning them belongs with the board.

`packages/ui` holds the design system: the token file, the `cn` helper, and every
shadcn/ui component. Both apps depend on it, so there is one palette rather than
one per app. Components are shadcn/ui built on **Base UI** — the components are
copied into our repo as source, which means they can be edited to suit the board
instead of fought with.

The alternative was shadcn in `apps/play` alone with the tokens in a shared CSS
file. It is less machinery today, but the landing page needs the same colours and
the same buttons eventually, and a second copy of the palette is the kind of thing
that drifts quietly.

## The palette is the one from the contribution-graph mock

The neutrals, the green ramp and the four language hues come from ADR 0014's mock,
where they were validated for both themes rather than chosen by eye. They are
mapped onto shadcn's token names — `--ground` became `--background`, `--ink` became
`--foreground`, the game's green became `--primary` — so there is one token system,
seeded with colours that had already been checked. What shadcn has no slot for is
kept alongside: `--lang-en/id/su/jv`, the `--level-0..4` ramp, and the Marks.

## Marks are stepped by lightness, not only hue

The three Marks are `--exact`, `--present` and `--absent`, each with its own
foreground. Every pair clears WCAG AA (4.5:1) and, more importantly, the three
backgrounds sit at clearly different lightnesses — roughly 16 / 41 / 69 in light
mode and 45 / 30 / 4 in dark. Desaturate the board and the three Marks are still
told apart, which is the same principle ADR 0014 applied to the graph when it put
language on row position instead of hue.

This is not a full answer for colour vision deficiency. Green and amber remain a
weak pair under deuteranopia, and lightness alone carries more weight than it
should. The fix, when someone asks for it, is a high-contrast option that swaps the
hues outright — the way Wordle does — not a nudge to these values.

## Theme follows the system, with no JavaScript

Light tokens on `:root`, dark tokens under `prefers-color-scheme: dark`, and
`data-theme` on `<html>` overriding either direction. Tailwind's `dark:` variant is
redefined to match, so shadcn components behave. `next-themes` buys only a manual
toggle and its no-flash script is Next-shaped, which would not help the play app;
it can be added the day a toggle is designed.

## Fonts

Geist and Geist Mono, self-hosted through `@fontsource-variable` in the shared CSS
so both apps load them the same way. The mock's Bricolage Grotesque and IBM Plex
were dropped.

## What is deliberately not installed

The library list names Sonner, motion, cmdk, recharts, NumberFlow, Virtuoso, zustand
and dnd-kit. None has a consumer yet. They go in when something needs them.
