import type { CSSProperties } from "react";

import { cn } from "@wordlex/ui/lib/utils";

/*
  Five solved boards, placed by hand rather than generated: the positions are a
  composition, not data. Each row is written as the word plus one character per
  Tile for its Mark — e/p/a — so a board reads as two short strings instead of
  an array of objects per Tile, and is expanded once at module load.

  Two placements, because the hero is wide and short and the sign-in page's
  second column is narrow and tall. Same boards, different composition.
*/
type Mark = "exact" | "present" | "absent";

function markOf(code: string): Mark {
  if (code === "e") return "exact";
  if (code === "p") return "present";
  return "absent";
}

const SPECS = [
  {
    hero: { x: "1%", y: "4%", rotate: "-7deg" },
    column: { x: "2%", y: "2%", rotate: "-6deg" },
    opacity: 0.34,
    tile: 56,
    delay: 0,
    rows: [
      { word: "AVERY", marks: "paepa" },
      { word: "TISAR", marks: "paaep" },
      { word: "GREAT", marks: "eeeee" },
    ],
  },
  {
    hero: { x: "44%", y: "-2%", rotate: "-3deg" },
    column: { x: "38%", y: "21%", rotate: "4deg" },
    opacity: 0.3,
    tile: 52,
    delay: 150,
    rows: [
      { word: "LYNCINE", marks: "paappae" },
      { word: "PIEWIPE", marks: "apaaaae" },
      { word: "ARTICLE", marks: "eeeeeee" },
    ],
  },
  {
    hero: { x: "73%", y: "6%", rotate: "5deg" },
    column: { x: "4%", y: "40%", rotate: "-3deg" },
    opacity: 0.4,
    tile: 58,
    delay: 300,
    rows: [
      { word: "MORWAP", marks: "aaeapa" },
      { word: "TORIDA", marks: "aaeaap" },
      { word: "BARANG", marks: "eeeeee" },
    ],
  },
  {
    hero: { x: "0%", y: "58%", rotate: "-5deg" },
    column: { x: "34%", y: "59%", rotate: "5deg" },
    opacity: 0.32,
    tile: 54,
    delay: 450,
    rows: [
      { word: "MANGGA", marks: "apaaae" },
      { word: "TARIKH", marks: "apapea" },
      { word: "CILAKA", marks: "eeeeee" },
    ],
  },
  {
    hero: { x: "68%", y: "54%", rotate: "-4deg" },
    column: { x: "1%", y: "78%", rotate: "-4deg" },
    opacity: 0.34,
    tile: 56,
    delay: 600,
    rows: [
      { word: "KERASAK", marks: "eppaaaa" },
      { word: "KERAKAP", marks: "eppaaaa" },
      { word: "KRINGÊT", marks: "eeeeeee" },
    ],
  },
];

const BOARDS = SPECS.map((spec, board) => ({
  hero: spec.hero,
  column: spec.column,
  opacity: spec.opacity,
  tile: spec.tile,
  delay: spec.delay,
  rows: spec.rows.map((row, line) => ({
    id: `${board}-${line}`,
    length: row.word.length,
    tiles: [...row.word].map((letter, column) => ({
      id: `${board}-${line}-${column}`,
      letter,
      mark: markOf(row.marks.charAt(column)),
      // The flip runs across the whole board, not per row.
      order: line * row.word.length + column,
    })),
  })),
}));

const MARK_TOKENS: Record<Mark, string> = {
  exact: "[--mark-bg:var(--exact)] [--mark-fg:var(--exact-foreground)]",
  present: "[--mark-bg:var(--present)] [--mark-fg:var(--present-foreground)]",
  absent: "[--mark-bg:var(--absent)] [--mark-fg:var(--absent-foreground)]",
};

/*
  In dark mode --present and --lang-su are the same hex, so full-chroma Marks
  here would read as "Basa Sunda" directly above the list where that hue means
  exactly that. Draining the chroma keeps the language hues the only saturated
  thing on the page (ADR 0016); the Marks still separate by lightness, which
  ADR 0016 calls the real encoding.
*/
const FIELD = "pointer-events-none absolute [filter:saturate(0.28)]";

/*
  Behind the hero the field breaks out of the 960px wrap to run edge to edge.
  Whatever clips it has to span the viewport, so `main` carries `overflow-x:
  clip` — `hidden` there would turn it into a scroll container and break the
  sticky header. Beside a column it simply fills the box it is given.
*/
const HERO_FIELD =
  "inset-y-0 left-1/2 w-screen -translate-x-1/2 [mask-image:linear-gradient(to_bottom,transparent_0%,black_9%,black_68%,transparent_98%)]";
const COLUMN_FIELD =
  "inset-0 [mask-image:linear-gradient(to_bottom,transparent_0%,black_6%,black_94%,transparent_100%)]";

/*
  The hole clears the text, not the left half of the page. Centred on the
  headline column, which stays near 42% of the viewport at every width because
  the wrap is centred. Beside a column there is no text to clear.
*/
const HERO_INNER =
  "[mask-image:radial-gradient(52%_68%_at_42%_44%,transparent_0%,transparent_42%,black_92%)] max-[860px]:[mask-image:linear-gradient(to_bottom,transparent_0%,black_60%)]";

/* Tiles shrink with the viewport. `clamp` on a ratio would be neater, but CSS
   cannot divide a length by a length portably, so these stay breakpoints. */
const BOARD = cn(
  "absolute grid gap-1 opacity-(--o) [--tile:var(--tile-base)]",
  "max-[1400px]:[--tile:calc(var(--tile-base)*0.82)]",
  "max-[1100px]:[--tile:calc(var(--tile-base)*0.7)]",
  "max-[860px]:[--tile:calc(var(--tile-base)*0.6)]",
);
/* Narrow behind the hero means fewer boards; the sign-in column is hidden
   outright below `lg`, so it never needs these. */
const HERO_BOARD =
  "max-[1100px]:[&:nth-child(2)]:hidden max-[860px]:[&:nth-child(n+5)]:hidden max-[860px]:opacity-[calc(var(--o)*0.5)]";

const TILE =
  "grid aspect-square w-(--tile) place-items-center rounded-md border border-border font-bold leading-none [font-size:calc(var(--tile)*0.46)] [backface-visibility:hidden] motion-safe:animate-field-flip motion-safe:[animation-delay:calc(var(--d)+var(--i)*40ms)] motion-reduce:border-transparent motion-reduce:bg-(--mark-bg) motion-reduce:text-(--mark-fg)";

/**
 * Decoration — hidden from assistive tech, and every board is already solved,
 * so nothing here is a claim about today's Dailies.
 *
 * `contained` swaps the full-bleed hero placement for filling whatever box it
 * is in, which is what the sign-in page's second column needs.
 */
export function BoardField({ contained = false }: { contained?: boolean }) {
  return (
    <div className={cn(FIELD, contained ? COLUMN_FIELD : HERO_FIELD)} aria-hidden>
      <div className={cn("absolute inset-0", !contained && HERO_INNER)}>
        {BOARDS.map((board) => {
          const at = contained ? board.column : board.hero;
          return (
            <div
              key={at.x + at.y}
              className={cn(BOARD, !contained && HERO_BOARD)}
              style={
                {
                  left: at.x,
                  top: at.y,
                  rotate: at.rotate,
                  "--o": board.opacity,
                  "--tile-base": `${board.tile}px`,
                  "--d": `${board.delay}ms`,
                } as CSSProperties
              }
            >
              {board.rows.map((row) => (
                <div
                  key={row.id}
                  className="grid [grid-template-columns:repeat(var(--len),var(--tile))] gap-1"
                  style={{ "--len": row.length } as CSSProperties}
                >
                  {row.tiles.map((tile) => (
                    <span
                      key={tile.id}
                      className={cn(TILE, MARK_TOKENS[tile.mark])}
                      style={{ "--i": tile.order } as CSSProperties}
                    >
                      {tile.letter}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
