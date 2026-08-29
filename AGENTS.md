# WordleX

A pnpm + Turborepo monorepo: three apps under `apps/`, two shared packages under
`packages/`. Each has a README; `README.md` at the root has the map.

Before changing anything, read `CONTEXT.md` — it fixes the vocabulary, and the
words in it (Tile, Guess, Mark, Track, Daily, Player, WordleX Day) are the names
used in code. It also lists words to avoid; "user", "mode" and "invalid word" are
wrong here for reasons written down.

Decisions live in `docs/adr/`, numbered and never rewritten — amend with a note at
the top instead. What is still undecided lives in `docs/open-questions.md`.

A few rules worth knowing before you edit:

- The Dictionary and Answer Pool belong to `apps/api`. Nothing importable by the
  browser may ever hold them (ADR 0003).
- Streaks, Candidate counts and Answer quality are derived by query, never stored
  as counters (ADRs 0008, 0009, 0012). A Streak is consecutive WordleX Days with a
  win on any Track (ADR 0026); Badges are predicates re-asked over a Player's whole
  history, so `badge_award` is a cache and never the source of truth (ADR 0011).
- UI components go in `packages/ui` via `pnpm dlx shadcn@latest add <name> -c
  packages/ui`, and use the design system's tokens rather than raw Tailwind
  colours (ADR 0016).
- Every API response is `{ data }` or `{ error: { code, message } }`, with the
  codes in `apps/api/src/http.ts` and the reasoning in ADR 0023. A route types
  what it sends, so drifting out of that shape is a type error.
- Google is the only way to sign in (ADR 0025), and `/api/auth/*` is the one route
  that answers in better-auth's shape rather than the envelope. Signing in mints
  the `player` row and carries over today's Games only (ADR 0027).
- Everything `apps/play` asks the API for is a TanStack Query query or mutation, and
  `api.ts` throws `ApiError` rather than returning a result (ADR 0031). Nothing there
  should grow its own loading flag or its own copy of a server answer. The effects
  left in that app subscribe to `window`, which is what effects are for.
- The writes this app defines (`POST /game`, `POST /guess`) require an
  `Idempotency-Key` holding a uuid and store it on the row they create, so a
  retry cannot spend a second Guess or start a second Game. On `POST /game` that
  key is a credential — read ADR 0024 before you touch it.

`pnpm build`, `pnpm check-types`, `pnpm test`, `pnpm lint`, `pnpm format`.

The lefthook hooks are narrower than that list: committing formats and lints the
staged files, pushing builds the affected packages and runs every test.
`apps/api`'s suite needs the `db-test` container — `docker compose up -d --wait
db-test` — and says so when it is missing. **Nothing runs `pnpm check-types` for
you**, so a type error in `apps/play` will still commit and push clean. Run it
yourself before you call work done.

<!-- intent-skills:start -->
## Skill Loading

Before editing files for a substantial task:
- Run `npx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `npx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->
