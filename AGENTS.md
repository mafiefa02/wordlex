# WordleX

A pnpm + Turborepo monorepo: three apps under `apps/`, two shared packages under
`packages/`. Each has a README; `README.md` at the root has the map.

Before changing anything, read `CONTEXT.md` — it fixes the vocabulary, and the
words in it (Tile, Guess, Mark, Track, Daily, Player, WordleX Day) are the names
used in code. It also lists words to avoid; "user", "mode" and "invalid word" are
wrong here for reasons written down.

Decisions live in `docs/adr/`, numbered and never rewritten — amend with a note at
the top instead. What is still undecided lives in `docs/open-questions.md`.

Three rules worth knowing before you edit:

- The Dictionary and Answer Pool belong to `apps/api`. Nothing importable by the
  browser may ever hold them (ADR 0003).
- Streaks, Candidate counts and Answer quality are derived by query, never stored
  as counters (ADRs 0008, 0009, 0012).
- UI components go in `packages/ui` via `pnpm dlx shadcn@latest add <name> -c
  packages/ui`, and use the design system's tokens rather than raw Tailwind
  colours (ADR 0016).

`pnpm build`, `pnpm check-types`, `pnpm test`, `pnpm lint`, `pnpm format`. Commits
and pushes run lefthook hooks that do the same.

<!-- intent-skills:start -->
## Skill Loading

Before editing files for a substantial task:
- Run `npx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `npx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->
