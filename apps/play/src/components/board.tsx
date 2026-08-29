import type { Length, Mark } from "@wordlex/domain";
import type { AnimationEvent, CSSProperties, ReactNode } from "react";
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
  width — from running under the keyboard on a phone. 410px is the chrome above
  and below it, measured rather than guessed, and generous enough for the Track
  bar on two lines. It includes the strip under the board, which reserves two
  lines so a Guess that did not send does not move the board — change one and
  this number moves with it.

  The floor stops a very short viewport, such as a phone held sideways, from
  shrinking the board to nothing; `main` scrolls there instead.
*/
const BOARD =
  "grid gap-1.5 [--tile:max(28px,min(60px,calc((min(100vw,540px)-32px-(var(--len)-1)*6px)/var(--len)),calc((100dvh-410px-(var(--rows)-1)*6px)/var(--rows))))]";

const ROW = "grid gap-1.5 [grid-template-columns:repeat(var(--len),var(--tile))]";

const TILE = cn(
  // `opacity` and `translate` are in the transition so the waiting wave has
  // something to ease back through when it stops — dropping an animation
  // returns the Tile to its base value in one frame otherwise.
  "grid aspect-square w-(--tile) place-items-center rounded-md border border-border [font-size:calc(var(--tile)*0.46)] leading-none font-bold transition-[border-color,opacity,translate] duration-150 ease-out [backface-visibility:hidden]",
  "data-filled:border-foreground/45",
  // A ring, not a blinking caret: a caret would repaint forever for the sake of
  // saying where the next Tile is.
  "data-next:[border-color:color-mix(in_oklch,var(--hue),transparent_30%)] data-next:[box-shadow:inset_0_0_0_1px_color-mix(in_oklch,var(--hue),transparent_30%)]",
  "data-mark:border-transparent data-mark:bg-(--mark-bg) data-mark:text-(--mark-fg)",
  // Drawn fainter while there is no board, so the grid reads as a frame rather
  // than as six rows waiting for a Guess.
  "data-blank:[border-color:color-mix(in_oklch,var(--border),transparent_45%)]",
);

/**
 * The rows a message stands in, straddling the board's middle so it lands in
 * the centre whatever the Track. A budget with no middle *pair* — seven
 * Guesses, on a 6-Tile Track — gives up a third row rather than sit off-centre.
 */
function middleRows(budget: number) {
  const half = Math.floor(budget / 2);
  return budget % 2 === 0 ? [half - 1, half] : [half - 1, half, half + 1];
}

type Guess = { word: string; marks: Mark[] };

/**
 * The board. Every row above `guesses.length` is empty, which is how many
 * Guesses are left — the same thing the result sheet shows at the end.
 *
 * `revealing` is the row mid-turn; `pending` is the Guess that has gone to the
 * server and not come back. The row lifts once when it goes and then settles
 * Tile by Tile until it lands — the one loop in this app, because a request of
 * unknown length is the one thing a fixed number of runs cannot describe. See
 * the note at the top of `app.css`. Under `prefers-reduced-motion` it is a
 * static dim instead, which is what the board did before.
 *
 * Until `ready`, there is no board: the Tiles draw faint and the ring is
 * withheld, because a ring on the first Tile says "type here" and nothing typed
 * would land. A `problem` stands in the rows the board is not using — the
 * message is read where the board would be rather than under it, and the grid
 * keeps its size so nothing moves when it arrives.
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
  ready,
  problem,
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
  ready: boolean;
  problem?: ReactNode;
  onShakeEnd: () => void;
}) {
  // With no board there is no live row, which is what withholds the ring.
  const live = ready && !over ? guesses.length : -1;
  const stood = problem ? middleRows(budget) : [];

  return (
    <section
      className={cn(BOARD, "relative")}
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
              // Hidden rather than dropped: the row keeps its space, so the
              // board is the same size with the message in it as without.
              stood.includes(row) && "invisible",
              // The dim is the reduced-motion answer only: with motion on, the
              // Tiles carry it themselves and a row dim on top would take the
              // word down to a third of its contrast at the wave's trough.
              row === live && pending && "motion-safe:animate-row-sent motion-reduce:opacity-60",
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
                    row === live && pending && "motion-safe:animate-row-waiting",
                    (turning || hops || (row === live && pending)) &&
                      "motion-safe:[animation-delay:calc(var(--i)*75ms)]",
                  )}
                  style={{ "--i": column } as CSSProperties}
                  data-mark={played?.marks[column]}
                  data-blank={ready ? undefined : true}
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

      {/* Bleeds to the padding `main` gives the board, so a short line is not
          made to wrap by a narrow Track. */}
      {problem ? (
        <div className="absolute -inset-x-3 top-1/2 grid -translate-y-1/2 justify-items-center gap-2 text-center">
          {problem}
        </div>
      ) : null}
    </section>
  );
}
