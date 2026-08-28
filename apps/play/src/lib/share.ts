import {
  LANGUAGE_NAMES,
  type Language,
  type Length,
  type Mark,
  type WordlexDay,
} from "@wordlex/domain";
import type { Board } from "./api";

/**
 * The two ways a finished Game leaves the app: as text on the clipboard, and as
 * an image for a Story. Both live here so they cannot disagree about what a
 * share is allowed to say.
 *
 * Neither one carries letters or the Answer — not even after the WordleX Day is
 * over. The result sheet may reveal a lost Answer at rollover because it is one
 * screen that closes; a share outlives the Day it was made in (ADR 0028).
 */

/** One square per Mark. Letters never travel with a share. */
const SQUARE: Record<Mark, string> = { exact: "🟩", present: "🟨", absent: "⬛" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * A WordleX Day as a reader sees it. The month stays English on every Track,
 * which is the cost of the format — the alternative was `2026-08-28` on both
 * paths, and a share is read by a person before it is read by anything else.
 */
function dayLabel(day: WordlexDay): string {
  const [year, month, date] = day.split("-");
  return `${Number(date)} ${MONTHS[Number(month) - 1]} ${year}`;
}

/**
 * What goes on the clipboard: only the Guesses that were made, because a blank
 * square in a text grid reads as a Mark. The image can afford the whole board —
 * an outline there is visibly an outline.
 */
export function shareText(board: Board, language: Language, length: Length, budget: number) {
  const track = `${LANGUAGE_NAMES[language]} ${length} Tiles`;
  const spent = board.status === "won" ? board.guesses.length : "X";
  return [
    `WORDLEX · ${track}`,
    `${dayLabel(board.day)} · ${spent}/${budget}`,
    "",
    board.guesses.map((guess) => guess.marks.map((mark) => SQUARE[mark]).join("")).join("\n"),
    "",
    "play.wordlex.afiefabd.com",
  ].join("\n");
}

// ---- the Story card ------------------------------------------------------

const W = 1080;
const H = 1920;

/*
  Instagram covers the top ~250px and the bottom ~310px of a Story with its own
  chrome. Everything that has to be read sits between them.
*/
const BAND_TOP = 250;
const BAND_BOTTOM = H - 310;

/*
  The card pins its own palette instead of reading the theme tokens. A share is
  not a themed surface — "does the PNG follow dark mode?" is a question worth
  never having — and `oklch()` is not safe in a canvas fillStyle everywhere the
  tokens are. The values are the dark theme's, copied.
*/
const BG = "#09090b";
const FG = "#fafafa";
const MUTED = "#a1a1aa";
const LINE = "rgb(255 255 255 / 0.14)";
const MARKS: Record<Mark, string> = { exact: "#47c79c", present: "#c08a20", absent: "#2f3633" };
const HUES: Record<Language, string> = {
  en: "#5289de",
  id: "#26a87f",
  su: "#c08a20",
  jv: "#c44e9b",
};

const FAMILY = "'Geist Variable', system-ui, sans-serif";
const font = (weight: number, size: number) => `${weight} ${size}px ${FAMILY}`;

type Ink = { font: string; fill: string; track?: number; align?: CanvasTextAlign };

function write(ctx: CanvasRenderingContext2D, string: string, x: number, y: number, ink: Ink) {
  ctx.save();
  ctx.font = ink.font;
  ctx.fillStyle = ink.fill;
  ctx.textAlign = ink.align ?? "center";
  ctx.textBaseline = "alphabetic";
  ctx.letterSpacing = `${ink.track ?? 0}px`;
  ctx.fillText(string, x, y);
  ctx.restore();
}

function measure(ctx: CanvasRenderingContext2D, string: string, face: string, track: number) {
  ctx.save();
  ctx.font = face;
  ctx.letterSpacing = `${track}px`;
  const width = ctx.measureText(string).width;
  ctx.restore();
  return width;
}

/* The logo mark, same geometry as `packages/ui`: four tiles at 0.456 of the box,
   rotated 45 degrees about their own centres, one per language hue in
   Dictionary order. */
function logoMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const tile = size * 0.456;
  const radius = Math.max(1, size * 0.087);
  const spots: [number, number, Language][] = [
    [x + tile / 2, y + tile / 2, "en"],
    [x + size - tile / 2, y + tile / 2, "id"],
    [x + tile / 2, y + size - tile / 2, "su"],
    [x + size - tile / 2, y + size - tile / 2, "jv"],
  ];
  for (const [cx, cy, language] of spots) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = HUES[language];
    ctx.beginPath();
    ctx.roundRect(-tile / 2, -tile / 2, tile, tile, radius);
    ctx.fill();
    ctx.restore();
  }
}

/** Mark and wordmark together, centred on `cx`. */
function lockup(ctx: CanvasRenderingContext2D, cx: number, y: number, size: number) {
  const gap = size * 0.33;
  const face = font(700, Math.round(size * 0.78));
  const track = size * -0.045;
  const left = cx - (size + gap + measure(ctx, "WORDLEX", face, track)) / 2;
  logoMark(ctx, left, y - size / 2, size);
  write(ctx, "WORDLEX", left + size + gap, y + size * 0.29, {
    font: face,
    fill: FG,
    track,
    align: "left",
  });
}

/**
 * The board as Marks, the whole budget of rows. A row past the Guesses made is
 * an outline, which is what an unspent row looks like on the board itself —
 * this is the sheet's mini-grid at poster size, not the clipboard's.
 */
function drawBoard(
  ctx: CanvasRenderingContext2D,
  { guesses, length, budget }: { guesses: Board["guesses"]; length: Length; budget: number },
) {
  const gap = 16;
  const tile = (620 - (length - 1) * gap) / length;
  const width = tile * length + gap * (length - 1);
  const height = budget * tile + (budget - 1) * gap;
  const x = (W - width) / 2;
  const y = 620 + (1420 - 620 - height) / 2;

  for (let row = 0; row < budget; row++) {
    for (let column = 0; column < length; column++) {
      const mark = guesses[row]?.marks[column];
      ctx.beginPath();
      ctx.roundRect(
        x + column * (tile + gap),
        y + row * (tile + gap),
        tile,
        tile,
        Math.max(3, tile * 0.16),
      );
      if (mark === undefined) {
        ctx.strokeStyle = LINE;
        ctx.lineWidth = Math.max(2, tile * 0.035);
        ctx.stroke();
      } else {
        ctx.fillStyle = MARKS[mark];
        ctx.fill();
      }
    }
  }
}

/**
 * The result sheet at 1080x1920: lockup, Track, what happened, the board, the
 * WordleX Day. Nothing here is per-player beyond the Marks themselves.
 *
 * Canvas takes the font it was told to take or silently falls back to a system
 * face, so the weights are loaded before the first stroke.
 */
export async function storyCard({
  board,
  language,
  length,
  budget,
}: {
  board: Board;
  language: Language;
  length: Length;
  budget: number;
}): Promise<Blob> {
  await Promise.all([
    document.fonts.load(font(700, 42)),
    document.fonts.load(font(600, 76)),
    document.fonts.load(font(500, 30)),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2d context for the share card.");

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  lockup(ctx, W / 2, BAND_TOP + 80, 54);
  write(ctx, `${LANGUAGE_NAMES[language]} · ${length} Tiles`, W / 2, 432, {
    font: font(600, 30),
    fill: MUTED,
    track: 2.4,
  });
  write(
    ctx,
    board.status === "won" ? `Solved in ${board.guesses.length}.` : "Out of Guesses.",
    W / 2,
    552,
    { font: font(600, 76), fill: FG, track: -1.6 },
  );

  drawBoard(ctx, { guesses: board.guesses, length, budget });

  write(ctx, dayLabel(board.day), W / 2, BAND_BOTTOM - 110, {
    font: font(500, 30),
    fill: MUTED,
  });
  write(ctx, "play.wordlex.afiefabd.com", W / 2, BAND_BOTTOM - 38, {
    font: font(500, 28),
    fill: MUTED,
    track: 1.2,
  });

  const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/png"));
  if (!blob) throw new Error("Could not draw the share card.");
  return blob;
}

/** ISO here rather than the card's own format: a filename is sorted, not read. */
export const cardName = (board: Board, language: Language, length: Length) =>
  `wordlex-${language}-${length}-${board.day}.png`;
