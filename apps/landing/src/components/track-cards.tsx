import type { CSSProperties } from "react";

import { cn } from "@wordlex/ui/lib/utils";

/*
  Four languages at three word lengths, which is the twelve Tracks the section
  above counts out loud. `cue` is the word for "play" in the language of the
  card it sits on — the one piece of copy here that is not English.
*/
const LANGUAGES = [
  { code: "en", name: "English", cue: "Play", hue: "var(--lang-en)" },
  { code: "id", name: "Bahasa Indonesia", cue: "Main", hue: "var(--lang-id)" },
  { code: "su", name: "Basa Sunda", cue: "Ulin", hue: "var(--lang-su)" },
  { code: "jv", name: "Basa Jawa", cue: "Dolan", hue: "var(--lang-jv)" },
] as const;

const LENGTHS = [5, 6, 7] as const;

const playUrl = process.env.NEXT_PUBLIC_PLAY_URL ?? "http://localhost:3001";

/*
  Each card sets --hue and everything else follows, so the four differ by one
  token. Hue only confirms: the glyph sits beside the name, never replacing it
  (ADR 0014).
*/
const CARD =
  "group relative flex flex-col gap-5 overflow-hidden rounded-lg p-7 [--edge:color-mix(in_oklch,var(--hue),transparent_74%)] [--tint:color-mix(in_oklch,var(--hue),var(--background)_92%)] border border-(--edge) bg-(--tint) transition-[background-color] duration-300 ease-out-strong hover:[background:color-mix(in_oklch,var(--hue),var(--background)_86%)]";

/*
  A cue, not a control — the three chips are the actual links, and a bare "Play"
  with no length behind it would be a promise it cannot keep. So it sits behind
  them as a wash: the language's own hue, faint, and masked away toward the name
  so it never competes with it. The word is meant to run past the corner and be
  cut by it.

  It is ten times the size of a chip, so it drifts sideways out of the corner it
  is anchored to rather than hopping up the way they do.
*/
const CUE = cn(
  "pointer-events-none absolute -top-[34px] -right-[30px] z-0 text-[132px] leading-none font-bold tracking-[-0.05em] text-(--hue) opacity-20 select-none",
  "[mask-image:linear-gradient(to_left,black_34%,transparent_76%)]",
  "transition-[opacity,transform] duration-300 ease-out-strong",
  "pointer-fine:opacity-0 pointer-fine:motion-safe:translate-x-4",
  "pointer-fine:group-hover:translate-x-0 pointer-fine:group-hover:opacity-20",
  "pointer-fine:group-focus-within:translate-x-0 pointer-fine:group-focus-within:opacity-20",
);

/*
  Only opacity and transform move, so the chips hold their space at rest —
  revealing them cannot resize a card or reflow the grid, and the empty room
  under the name is what makes the card look hoverable.

  Touch has no hover, so there the twelve Tracks are simply always visible.
  Only a real pointer gets the reveal.
*/
const CHIP = cn(
  "inline-flex items-center justify-center rounded-md border border-(--edge) px-3.5 py-[7px] text-sm leading-5 font-semibold text-foreground tabular-nums no-underline",
  "transition-[opacity,transform,background-color,border-color] duration-300 ease-out-strong",
  "hover:[border-color:color-mix(in_oklch,var(--hue),transparent_40%)] hover:[background:color-mix(in_oklch,var(--hue),var(--background)_78%)]",
  "pointer-fine:opacity-0 pointer-fine:motion-safe:translate-y-2",
  "pointer-fine:group-hover:translate-y-0 pointer-fine:group-hover:opacity-100",
  "pointer-fine:group-focus-within:translate-y-0 pointer-fine:group-focus-within:opacity-100",
);

/*
  The cue leads, then the three ways to play. The delays are on the revealed
  state only, so leaving takes everything out together instead of unwinding the
  stagger backwards — and `motion-safe` keeps the choreography off the reduced
  motion path without an override to fight.
*/
const STAGGER = [
  "pointer-fine:group-hover:motion-safe:delay-[50ms] pointer-fine:group-focus-within:motion-safe:delay-[50ms]",
  "pointer-fine:group-hover:motion-safe:delay-[100ms] pointer-fine:group-focus-within:motion-safe:delay-[100ms]",
  "pointer-fine:group-hover:motion-safe:delay-[150ms] pointer-fine:group-focus-within:motion-safe:delay-[150ms]",
];

export function TrackCards() {
  return (
    <>
      <div className="mt-8 grid gap-3 min-[861px]:grid-cols-2">
        {LANGUAGES.map((language) => (
          <div
            key={language.code}
            className={CARD}
            style={{ "--hue": language.hue } as CSSProperties}
          >
            <span className={CUE} aria-hidden>
              {language.cue}
            </span>
            <p className="relative z-1 flex items-center gap-4 text-[26px] leading-8 font-semibold tracking-[-0.02em]">
              <span className="size-7 shrink-0 rotate-45 rounded-lg bg-(--hue)" aria-hidden />
              {language.name}
            </p>
            <div className="relative z-1 flex flex-wrap gap-2">
              {LENGTHS.map((length, index) => (
                <a
                  key={length}
                  className={cn(CHIP, STAGGER[index])}
                  href={`${playUrl}/?lang=${language.code}&length=${length}`}
                >
                  {length} Letters
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-border px-5 py-3.5 text-sm text-muted-foreground">
        <b className="font-semibold text-foreground">More languages</b>
        Each one needs a Dictionary and an Answer Pool built before it can open.
        <span className="ml-auto">Not yet</span>
      </p>
    </>
  );
}
