import { dayEndsAt, LANGUAGE_NAMES, type Language, type Length, type Mark } from "@wordlex/domain";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { Button } from "@wordlex/ui/components/button";
import { LogoMark } from "@wordlex/ui/components/logo";
import { cn } from "@wordlex/ui/lib/utils";
import type { Board } from "@/lib/api";

/** One square per Mark. Letters never travel with a share. */
const SQUARE: Record<Mark, string> = { exact: "🟩", present: "🟨", absent: "⬛" };

/* Empty by default, so an unspent Guess is an outline and a spent one is a Mark. */
const CELL =
  "size-[15px] rounded-[3px] shadow-[inset_0_0_0_1px_var(--border)] data-mark:bg-(--mark-bg) data-mark:shadow-none";

function shareText(board: Board, language: Language, length: Length, budget: number) {
  const track = `${LANGUAGE_NAMES[language]} ${length} Tiles`;
  const spent = board.status === "won" ? board.guesses.length : "X";
  return [
    `WORDLEX · ${track}`,
    `${board.day} · ${spent}/${budget}`,
    "",
    board.guesses.map((guess) => guess.marks.map((mark) => SQUARE[mark]).join("")).join("\n"),
    "",
    "play.wordlex.afiefabd.com",
  ].join("\n");
}

/**
 * The result, and the copy of it. The grid here is the *whole* board — the rows
 * that were never spent included — so it reads the same as the board behind it.
 *
 * A lost Game keeps the Answer to itself until the WordleX Day is over, even
 * though the API sends it the moment the Game ends (ADR 0003 only holds it back
 * while the Game is live). Everyone is on the same Daily, so a screenshot
 * posted at noon would spoil it for everyone who has not played yet — and
 * nothing else on this screen gives the word away.
 * What goes on the clipboard is only the Guesses that were made, because blank
 * squares in a shared grid read as Marks.
 */
export function ResultSheet({
  board,
  language,
  length,
  budget,
  onClose,
}: {
  board: Board;
  language: Language;
  length: Length;
  budget: number;
  onClose: () => void;
}) {
  const [label, setLabel] = useState("Copy result");
  const won = board.status === "won";

  // One timer set for the rollover rather than a clock that ticks: the Answer
  // is worth showing the moment the Day it belonged to is over, and a board
  // left open across 00:00 WIB is the only way to be here when that happens.
  const [dayOver, setDayOver] = useState(() => Date.now() >= dayEndsAt(board.day).getTime());
  useEffect(() => {
    if (dayOver) return;
    const timer = setTimeout(() => setDayOver(true), dayEndsAt(board.day).getTime() - Date.now());
    return () => clearTimeout(timer);
  }, [board.day, dayOver]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareText(board, language, length, budget));
      setLabel("Copied");
    } catch {
      setLabel("Could not copy");
    }
    setTimeout(() => setLabel("Copy result"), 1800);
  }

  return (
    <section
      aria-label="Result"
      className="motion-safe:animate-sheet-up fixed inset-x-0 bottom-0 z-20 mx-auto grid max-w-[540px] justify-items-center gap-3 rounded-t-xl border-t border-border bg-popover px-5 pt-6 pb-[calc(24px+env(safe-area-inset-bottom))] shadow-[0_-20px_50px_-30px_rgb(0_0_0/0.6)]"
    >
      <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.07em] text-muted-foreground uppercase">
        <LogoMark size={14} />
        WordleX · {LANGUAGE_NAMES[language]} {length} Tiles
      </p>

      <h2 className="text-[22px] font-semibold tracking-[-0.02em]">
        {won ? `Solved in ${board.guesses.length}.` : "Out of Guesses."}
      </h2>

      {board.answer !== undefined && !won && dayOver ? (
        <p className="text-[22px] font-bold tracking-[0.06em] uppercase">{board.answer}</p>
      ) : null}

      <div className="grid gap-[3px]">
        {[...Array(budget).keys()].map((row) => (
          <div
            key={row}
            className="grid [grid-template-columns:repeat(var(--len),15px)] gap-[3px]"
            style={{ "--len": length } as CSSProperties}
          >
            {[...Array(length).keys()].map((column) => (
              <span
                key={column}
                className={cn(
                  CELL,
                  "motion-safe:animate-mini-in motion-safe:[animation-delay:calc(var(--i)*22ms)]",
                )}
                style={{ "--i": row * length + column } as CSSProperties}
                data-mark={board.guesses[row]?.marks[column]}
              />
            ))}
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">Next Daily at 00:00 WIB.</p>

      <div className="flex flex-wrap justify-center gap-2">
        {/* The label is the whole confirmation — a toast here would land on the sheet. */}
        <Button size="lg" onClick={copy}>
          {label}
        </Button>
        <Button size="lg" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </section>
  );
}
