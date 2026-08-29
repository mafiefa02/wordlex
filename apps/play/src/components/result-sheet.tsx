import { dayEndsAt, LANGUAGE_NAMES, type Language, type Length } from "@wordlex/domain";
import { useQuery } from "@tanstack/react-query";
import type { CSSProperties } from "react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Button } from "@wordlex/ui/components/button";
import { LogoMark } from "@wordlex/ui/components/logo";
import { cn } from "@wordlex/ui/lib/utils";
import type { Board } from "@/lib/api";
import { cardName, shareText, storyCard } from "@/lib/share";

/* An empty stand-in, so whether this browser hands files to the share sheet can
   be answered before the card has finished drawing — otherwise the button's
   label flips from "Save image" to "Share image" in front of the player. */
const PROBE = new File([], "wordlex.png", { type: "image/png" });

/* Empty by default, so an unspent Guess is an outline and a spent one is a Mark. */
const CELL =
  "size-[15px] rounded-[3px] shadow-[inset_0_0_0_1px_var(--border)] data-mark:bg-(--mark-bg) data-mark:shadow-none";

/**
 * The result, and the copy of it. The grid here is the *whole* board — the rows
 * that were never spent included — so it reads the same as the board behind it.
 *
 * A lost Game keeps the Answer to itself until the WordleX Day is over, even
 * though the API sends it the moment the Game ends (ADR 0003 only holds it back
 * while the Game is live). Everyone is on the same Daily, so a screenshot
 * posted at noon would spoil it for everyone who has not played yet — and
 * nothing else on this screen gives the word away.
 * Neither share carries the Answer at all, at any time of day — a picture
 * outlives the Day it was made in (ADR 0028).
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

  // A press anywhere that is not the sheet puts it away — the blurred board
  // below it, and the Track bar above it that stays sharp. `pointerdown` rather
  // than `click`, so the press that opened the sheet cannot close it again on
  // the way back up, and so a result dragged over to be selected keeps it open.
  // The listener is bound once; `close` is an effect event, so it reads the
  // latest `onClose` without the effect resubscribing on every render.
  const sheet = useRef<HTMLElement>(null);
  const close = useEffectEvent(onClose);
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      // Primary press only, so a right-click does not put the sheet away
      // underneath the context menu it is opening. Touch has no equivalent —
      // a long-press is button 0 — so this covers a pointer and nothing else.
      if (event.button !== 0) return;
      if (event.target instanceof Node && sheet.current?.contains(event.target)) return;
      close();
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  /*
    The card is drawn when the sheet opens rather than when the button is
    pressed: Safari refuses `navigator.share` once too long has passed since the
    gesture that led to it, and drawing is the slow half.

    Not a request, but the same shape as one — slow, either a result or a
    failure, and worth keeping once it lands — so it is asked for the same way
    (ADR 0031). Nothing to retry: a canvas that would not draw once will not
    draw on a second press, and the button says so and stays out of Copy's way.
  */
  const { data: card, isError: undrawable } = useQuery({
    // The Track keys the whole screen and a board stops changing once the Game
    // is over, so one Daily on one Track is one card.
    queryKey: ["story-card", language, length, board.day],
    // The one query here that is never re-asked. A board stops changing once
    // the Game is over, so the card drawn from it cannot go stale — and without
    // this, closing the sheet and reopening it redraws the whole canvas.
    staleTime: Infinity,
    queryFn: async () => {
      const drawn = await storyCard({ board, language, length, budget });
      return new File([drawn], cardName(board, language, length), { type: "image/png" });
    },
  });

  // Handing a file to the share sheet is the only route a browser has to
  // Instagram — there is no way to open the Stories composer directly. Where
  // there is no such sheet, the file is downloaded and the label says so.
  const shareable = navigator.canShare?.({ files: [card ?? PROBE] }) ?? false;

  // One timer set for the rollover rather than a clock that ticks: the Answer
  // is worth showing the moment the Day it belonged to is over, and a board
  // left open across 00:00 WIB is the only way to be here when that happens.
  const [dayOver, setDayOver] = useState(() => Date.now() >= dayEndsAt(board.day).getTime());
  useEffect(() => {
    if (dayOver) return;
    const timer = setTimeout(() => setDayOver(true), dayEndsAt(board.day).getTime() - Date.now());
    return () => clearTimeout(timer);
  }, [board.day, dayOver]);

  async function shareImage() {
    if (card === undefined) return;
    if (shareable) {
      try {
        return await navigator.share({ files: [card] });
      } catch (error) {
        // A cancelled share is a decision, not a failure. Anything else falls
        // through to the download, which always works.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(card);
    Object.assign(document.createElement("a"), { href: url, download: card.name }).click();
    // Next tick, not this one: Firefox cancels a download whose URL is revoked
    // before it has started reading it.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

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
      ref={sheet}
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
        <Button size="lg" onClick={shareImage} disabled={card === undefined}>
          {undrawable ? "Could not draw it" : shareable ? "Share image" : "Save image"}
        </Button>
        {/* The label is the whole confirmation — a toast here would land on the sheet. */}
        <Button size="lg" variant="secondary" onClick={copy}>
          {label}
        </Button>
        <Button size="lg" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </section>
  );
}
