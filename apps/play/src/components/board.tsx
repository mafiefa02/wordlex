import type { Length, Mark } from "@wordlex/domain";
import type { AnimationEvent, CSSProperties } from "react";
import { cn } from "@wordlex/ui/lib/utils";

/*
  Tiles size themselves off the viewport, capped so a 5-Tile board does not turn
  into slabs on a desktop. `min()` rather than breakpoints: the divisor is the
  word length, which changes with the Track and not with the screen.
*/
/*
  A Tile is the smallest of three: a cap so a 5-Tile board is not slabs on a
  desktop, what the viewport's width allows, and what its height allows. The
  height term is what keeps a 6-Tile board — seven rows, the tallest for its
  width — from running under the keyboard on a phone. 390px is the chrome above
  and below it, measured rather than guessed, and generous enough for the Track
  bar on two lines.

  The floor stops a very short viewport, such as a phone held sideways, from
  shrinking the board to nothing; `main` scrolls there instead.
*/
const BOARD =
  "grid gap-1.5 [--tile:max(28px,min(60px,calc((min(100vw,540px)-32px-(var(--len)-1)*6px)/var(--len)),calc((100dvh-390px-(var(--rows)-1)*6px)/var(--rows))))]";

const ROW = "grid gap-1.5 [grid-template-columns:repeat(var(--len),var(--tile))]";

const TILE = cn(
  "grid aspect-square w-(--tile) place-items-center rounded-md border border-border [font-size:calc(var(--tile)*0.46)] leading-none font-bold transition-[border-color] duration-150 ease-out [backface-visibility:hidden]",
  "data-filled:border-foreground/45",
  // A ring, not a blinking caret: a caret would repaint forever for the sake of
  // saying where the next Tile is.
  "data-next:[border-color:color-mix(in_oklch,var(--hue),transparent_30%)] data-next:[box-shadow:inset_0_0_0_1px_color-mix(in_oklch,var(--hue),transparent_30%)]",
  "data-mark:border-transparent data-mark:bg-(--mark-bg) data-mark:text-(--mark-fg)",
);

type Guess = { word: string; marks: Mark[] };

/**
 * The board. Every row above `guesses.length` is empty, which is how many
 * Guesses are left — the same thing the result sheet shows at the end.
 *
 * `revealing` is the row mid-turn; `pending` is the Guess that has gone to the
 * server and not come back. The second is a static dim rather than a spinner,
 * because it lasts an unknown length of time and nothing here may repaint on a
 * timer.
 */
export function Board({
  length,
  budget,
  guesses,
  typed,
  revealing,
  hopping,
  shaking,
  pending,
  over,
  onShakeEnd,
}: {
  length: Length;
  budget: number;
  guesses: Guess[];
  typed: string;
  revealing: number | undefined;
  hopping: boolean;
  shaking: boolean;
  pending: boolean;
  over: boolean;
  onShakeEnd: () => void;
}) {
  const live = over ? -1 : guesses.length;

  return (
    <section
      className={BOARD}
      style={{ "--len": length, "--rows": budget } as CSSProperties}
      aria-label="Board"
    >
      {[...Array(budget).keys()].map((row) => {
        const played = guesses[row];
        const turning = row === revealing;
        const hops = hopping && row === guesses.length - 1;

        return (
          <div
            key={row}
            className={cn(
              ROW,
              row === live && pending && "motion-safe:animate-row-sent opacity-60",
              row === live && shaking && "motion-safe:animate-row-shake",
            )}
            onAnimationEnd={(event: AnimationEvent<HTMLDivElement>) => {
              if (event.animationName === "row-shake") onShakeEnd();
            }}
          >
            {[...Array(length).keys()].map((column) => {
              const letter = played
                ? played.word.toUpperCase().charAt(column)
                : row === live
                  ? typed.charAt(column)
                  : "";

              return (
                <div
                  key={column}
                  aria-label={played ? `${letter}, ${played.marks[column]}` : undefined}
                  className={cn(
                    TILE,
                    turning && "motion-safe:animate-tile-flip",
                    hops && "motion-safe:animate-tile-hop",
                    (turning || hops) && "motion-safe:[animation-delay:calc(var(--i)*75ms)]",
                  )}
                  style={{ "--i": column } as CSSProperties}
                  data-mark={played?.marks[column]}
                  data-filled={row === live && letter !== "" ? true : undefined}
                  data-next={row === live && column === typed.length ? true : undefined}
                >
                  {letter}
                </div>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}
