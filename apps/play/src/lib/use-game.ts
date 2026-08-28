import { guessBudget, type Language, type Length, type Mark } from "@wordlex/domain";
import { useCallback, useEffect, useRef, useState } from "react";
import { type Board, readBoard, type Result, startGame, type Submitted, submitGuess } from "./api";

/** How long a row takes to turn, Tile by Tile. Mirrors `app.css`. */
const STAGGER = 75;
const TURN = 420;
const HOP = 480;
const revealMs = (length: number) => (length - 1) * STAGGER + TURN;
const hopMs = (length: number) => (length - 1) * STAGGER + HOP;

function stillness() {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * What a Player is told when a request fails. The API's own messages are
 * written for a log (ADR 0023 says so outright), so they are mapped rather than
 * shown.
 */
const TROUBLE: Record<string, string> = {
  UNREACHABLE: "Could not reach the game.",
  TRACK_UNAVAILABLE: "No words for this Track yet.",
  IDEMPOTENCY_KEY_REUSED: "That Game is already being played.",
};
const trouble = (code: string) => TROUBLE[code] ?? "Something went wrong.";

const RANK: Record<Mark, number> = { absent: 0, present: 1, exact: 2 };

/**
 * One Track's Game, start to finish.
 *
 * The board is read on mount and on every Track change, and it is always the
 * server's board rather than one built up here — `POST /guess` reads its own
 * board back for exactly that reason, and two ways of assembling one is how
 * they drift apart.
 */
export function useGame(language: Language, length: Length) {
  const budget = guessBudget(length);

  const [board, setBoard] = useState<Board>();
  const [problem, setProblem] = useState<{ code: string; text: string }>();
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  /** The row mid-turn. The keyboard has not seen it yet. */
  const [revealing, setRevealing] = useState<number>();
  const [hopping, setHopping] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [note, setNote] = useState<{ text: string; at: number }>();
  const [sheet, setSheet] = useState(false);

  /**
   * The `Idempotency-Key`s, one per intent rather than one per press (ADR 0024).
   *
   * Starting is one intent for the whole Track: two presses of Enter are the
   * same Game. Submitting is one intent per *word*, and it has to survive a
   * failure — a Guess whose response was lost has landed on the server, so
   * pressing Enter again under a fresh uuid would spend a second row with the
   * same word in it. The key is dropped only once the server has answered.
   */
  const startKey = useRef<string>(undefined);
  const guessKey = useRef<{ word: string; key: string }>(undefined);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function later(run: () => void, ms: number) {
    timers.current.push(setTimeout(run, ms));
  }

  /**
   * `useCallback` for the dependency, not for the memoisation ADR 0017 hands to
   * the compiler: the effect below has to fire when the Track changes and not
   * on every render, and "Try again" is the same request sent twice.
   */
  const load = useCallback(() => {
    readBoard({ language, length }).then((result) => {
      if (result.ok) {
        setBoard(result.data.game);
        setProblem(undefined);
      } else {
        setProblem({ code: result.code, text: trouble(result.code) });
      }
    });
  }, [language, length]);

  // Nothing here guards against a response arriving after unmount — setting
  // state then is a no-op. The timers are what has to be cleared, since one
  // still pending would open a result sheet on a screen that has gone.
  useEffect(() => {
    const running = timers.current;
    load();
    return () => {
      for (const timer of running) clearTimeout(timer);
      timers.current = [];
    };
  }, [load]);

  const guesses = board?.guesses ?? [];
  const over = board !== undefined && board.status !== "playing";

  /** Only rows that have finished turning have reached the keyboard. */
  const keyMarks = new Map<string, Mark>();
  for (const guess of revealing === undefined ? guesses : guesses.slice(0, revealing)) {
    for (const [i, letter] of [...guess.word.toUpperCase()].entries()) {
      const mark = guess.marks[i];
      const held = keyMarks.get(letter);
      if (mark !== undefined && (held === undefined || RANK[mark] > RANK[held])) {
        keyMarks.set(letter, mark);
      }
    }
  }

  function say(text: string) {
    setNote({ text, at: Date.now() });
  }

  /** A word the board refuses: it spends no row, so the row says no and stays. */
  function refuse(text: string) {
    say(text);
    setShaking(true);
  }

  function settle(next: Board) {
    if (next.status === "playing") return;
    const quiet = stillness();
    if (next.status === "won" && !quiet) {
      setHopping(true);
      later(() => setHopping(false), hopMs(length));
    }
    later(() => setSheet(true), quiet ? 0 : next.status === "won" ? 380 : 120);
  }

  async function submit() {
    if (!board) return;
    if (typed.length < length) return refuse("Not enough Tiles.");

    const word = typed;
    const row = board.guesses.length;
    const track = { language, length };
    setPending(true);

    let result: Result<Submitted>;
    try {
      const key = keyForGuess(word);
      result = await submitGuess(track, word, key);

      // A Guess never creates a Game (ADR 0022), so the first one on a Track is
      // answered with a 401 until there is a Game to attach it to. The same key
      // goes out again — a second uuid would spend a second row.
      if (!result.ok && result.code === "NO_GAME_TOKEN") {
        const started = await startGame(track, keyForStart());
        if (!started.ok) return say(trouble(started.code));
        result = await submitGuess(track, word, key);
      }
    } finally {
      // Whatever went wrong, the keyboard has to come back. Without this a
      // throw — `crypto.randomUUID` refuses outside a secure context — leaves
      // the board silently dead.
      setPending(false);
    }

    // The server answered, so the key has done its job. It is kept only when it
    // did not, which is the case a retry has to collapse.
    if (result.ok || result.code !== "UNREACHABLE") guessKey.current = undefined;

    if (!result.ok) {
      // The one failure that carries state: `details.game` is the finished
      // board, so there is nothing more to ask for.
      if (result.code === "GAME_OVER") {
        const ended = (result.details as { game?: Board } | undefined)?.game;
        if (ended) {
          setBoard(ended);
          setTyped("");
          setSheet(true);
        }
        return;
      }
      return say(trouble(result.code));
    }

    // Not an error and not a Guess — our Dictionary is missing a word, and the
    // API has written it down (ADR 0009). The row is not spent.
    if (result.data.outcome === "unknown_word") {
      return refuse("Not in our Dictionary yet. Noted.");
    }

    const next = result.data.game;
    setTyped("");
    setBoard(next);
    if (stillness()) return settle(next);
    setRevealing(row);
    later(() => {
      setRevealing(undefined);
      settle(next);
    }, revealMs(length));
  }

  function keyForStart() {
    startKey.current ??= crypto.randomUUID();
    return startKey.current;
  }

  /** The same word keeps its key; a different one is a different submission. */
  function keyForGuess(word: string) {
    if (guessKey.current?.word !== word) guessKey.current = { word, key: crypto.randomUUID() };
    return guessKey.current.key;
  }

  function press(input: string) {
    if (board === undefined || over || pending || revealing !== undefined) return;
    if (input === "ENTER") return void submit();
    if (input === "DEL") return setTyped((it) => it.slice(0, -1));
    setTyped((it) => (it.length >= length ? it : it + input));
  }

  return {
    board,
    problem,
    budget,
    guesses,
    typed,
    over,
    pending,
    revealing,
    hopping,
    shaking,
    note,
    sheet,
    keyMarks,
    press,
    retry: load,
    openSheet: () => setSheet(true),
    closeSheet: () => setSheet(false),
    endShake: () => setShaking(false),
    dismissNote: () => setNote(undefined),
  };
}
