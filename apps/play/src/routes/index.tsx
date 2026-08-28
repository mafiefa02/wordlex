import { LANGUAGES, LENGTHS, type Language, type Length, wordlexDay } from "@wordlex/domain";
import { createFileRoute } from "@tanstack/react-router";
import { type } from "arktype";
import { useEffect, useRef } from "react";
import { Logo } from "@wordlex/ui/components/logo";
import { cn } from "@wordlex/ui/lib/utils";
import { AuthControl } from "@/components/auth-control";
import { Board } from "@/components/board";
import { Keyboard } from "@/components/keyboard";
import { ResultSheet } from "@/components/result-sheet";
import { HUE, TrackBar } from "@/components/track-bar";
import { useGame } from "@/lib/use-game";

// The Track lives in the URL, which is the reason this app is TanStack Start
// (ADR 0001). CONTEXT.md avoids "mode", so the length param is spelled out.
const Lang = type.enumerated(...LANGUAGES);
const Len = type.enumerated(...LENGTHS);

// The landing page is a separate deployment (ADR 0006), so the lockup is a plain
// href out of this app rather than a route. Same shape as the landing page's own
// link back here.
const siteUrl = import.meta.env.VITE_SITE_URL ?? "http://localhost:3000";

export const Route = createFileRoute("/")({
  // Each half falls back on its own, so a junk length keeps the language the
  // player asked for. A hand-edited or stale link is normal, not a crash.
  validateSearch: (search: Record<string, unknown>) => {
    const lang = Lang(search.lang);
    const length = Len(search.length);
    return {
      lang: lang instanceof type.errors ? "en" : lang,
      length: length instanceof type.errors ? 5 : length,
    };
  },
  component: Home,
});

function Home() {
  const { lang, length } = Route.useSearch();

  return (
    <div className={cn("flex h-dvh flex-col", HUE[lang])}>
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <a
          href={siteUrl}
          aria-label="WordleX home"
          className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo size={22} />
        </a>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground tabular-nums">{wordlexDay()}</span>
          <AuthControl />
        </div>
      </header>

      <TrackBar language={lang} length={length} />

      {/* Keyed by Track, so changing Track is a fresh screen rather than one
          unpicked by hand — which is what dismisses the result sheet. */}
      <Game key={`${lang}-${length}`} language={lang} length={length} />
    </div>
  );
}

function Game({ language, length }: { language: Language; length: Length }) {
  const game = useGame(language, length);

  // A physical keyboard is the main way in on a desktop. The listener is bound
  // once and reads the latest `press` through a ref, so a re-render does not
  // resubscribe.
  const latest = useRef({ press: game.press, closeSheet: game.closeSheet });
  useEffect(() => {
    latest.current = { press: game.press, closeSheet: game.closeSheet };
  });
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      // The sign-in dialog and the Account menu own every key while they are
      // open, Escape included — otherwise typing over an open dialog would
      // fill the board behind it. The result sheet is not one of these: it is
      // a plain section, so Escape still puts it away.
      if (event.target instanceof HTMLElement && event.target.closest("[role=dialog]")) return;
      if (event.key === "Escape") return latest.current.closeSheet();
      // A focused control owns its own Enter. Without this, tabbing to a key on
      // the on-screen keyboard and pressing it would submit the row as well as
      // type the letter.
      if (event.target instanceof HTMLElement && event.target.closest("a, button")) return;
      if (event.key === "Enter") latest.current.press("ENTER");
      else if (event.key === "Backspace") latest.current.press("DEL");
      else if (/^[a-z]$/i.test(event.key)) latest.current.press(event.key.toUpperCase());
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const noted = game.note?.at;
  const dismiss = game.dismissNote;
  useEffect(() => {
    if (noted === undefined) return;
    const timer = setTimeout(dismiss, 1600);
    return () => clearTimeout(timer);
  }, [noted, dismiss]);

  return (
    <>
      {/* The sheet sits outside the blurred half, so a finished board can be
          screenshotted without giving the Answer away — while the Track bar
          above stays sharp and usable. */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          inert={game.sheet}
          className={cn("flex min-h-0 flex-1 flex-col", game.sheet && "blur-[6px]")}
        >
          <main className="grid min-h-0 flex-1 [place-content:safe_center] justify-items-center gap-4 overflow-y-auto px-4 py-3">
            <Board
              length={length}
              budget={game.budget}
              guesses={game.guesses}
              typed={game.typed}
              revealing={game.revealing}
              hopping={game.hopping}
              shaking={game.shaking}
              pending={game.pending}
              over={game.over}
              onShakeEnd={game.endShake}
            />
            <p className="flex min-h-6 items-center text-sm text-muted-foreground">
              {game.problem ? (
                <>
                  {game.problem.text}{" "}
                  {game.problem.code === "TRACK_UNAVAILABLE" ? (
                    "Try another Track."
                  ) : (
                    <button
                      type="button"
                      className="ml-1 underline underline-offset-4 hover:text-foreground"
                      onClick={game.retry}
                    >
                      Try again
                    </button>
                  )}
                </>
              ) : game.over && !game.sheet ? (
                <button
                  type="button"
                  className="underline underline-offset-4 hover:text-foreground"
                  onClick={game.openSheet}
                >
                  See result
                </button>
              ) : game.board !== undefined && game.guesses.length === 0 && game.typed === "" ? (
                "Type to start."
              ) : null}
            </p>
          </main>

          <Keyboard marks={game.keyMarks} onPress={game.press} />
        </div>

        {game.sheet ? (
          <div
            aria-hidden
            className="motion-safe:animate-scrim-in absolute inset-0 bg-background/45"
          />
        ) : null}
      </div>

      {game.sheet && game.board !== undefined ? (
        <ResultSheet
          board={game.board}
          language={language}
          length={length}
          budget={game.budget}
          onClose={game.closeSheet}
        />
      ) : null}

      {game.note ? (
        <output
          key={game.note.at}
          className="motion-safe:animate-toast-in fixed inset-x-0 bottom-2 z-30 mx-auto w-max max-w-[92vw] rounded-lg bg-foreground px-3.5 py-2 text-center text-[13px] font-medium text-background shadow-[0_8px_24px_-12px_rgb(0_0_0/0.5)]"
        >
          {game.note.text}
        </output>
      ) : null}
    </>
  );
}
