import { guessBudget, type Language, type Length, type Mark, wordlexDay } from "@wordlex/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ApiError, type Board, readBoard, startGame, type Submitted, submitGuess } from "./api";
import { readBoardSnapshot, saveBoardSnapshot } from "./board-snapshot";

/** How long a row takes to turn, Tile by Tile. Mirrors `app.css`. */
const STAGGER = 75;
const TURN = 420;
const HOP = 480;
const revealMs = (length: number) => (length - 1) * STAGGER + TURN;
const hopMs = (length: number) => (length - 1) * STAGGER + HOP;

/** Long enough to read a short line, short enough to be gone before the next one. */
const NOTE_MS = 1600;

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
  BOARD_EXPIRED: "This board has expired. Refresh for the next Daily.",
};
const trouble = (code: string) => TROUBLE[code] ?? "Something went wrong.";

const RANK: Record<Mark, number> = { absent: 0, present: 1, exact: 2 };

/**
 * One Track's Game, start to finish.
 *
 * The board is the query's data and nothing else: it is always the server's
 * board rather than one built up here — `POST /guess` reads its own board back
 * for exactly that reason, and two ways of assembling one is how they drift
 * apart. A scored Guess writes the board it came back with into the cache, so
 * there is still only the one copy.
 *
 * Everything else here is presentation — what is typed, which row is turning,
 * whether the sheet is up — and stays local state, because none of it is the
 * server's to know.
 */
export function useGame(language: Language, length: Length) {
  const budget = guessBudget(length);
  const queryClient = useQueryClient();
  const boardKey = ["board", language, length];
  const track = { language, length };

  /*
    Kept per Track rather than thrown away on a Track change (ADR 0031), so
    hopping back to a Track you have played shows its board at once and the
    read that confirms it runs behind. `staleTime` is left at zero for that
    reason: every mount re-reads.
  */
  const {
    data: board,
    error,
    errorUpdatedAt,
    isFetching: reading,
    refetch,
  } = useQuery({
    queryKey: boardKey,
    queryFn: async () => {
      const next = await readBoard(track);
      saveBoardSnapshot(track, next);
      return next;
    },
    initialData: () => readBoardSnapshot(track),
  });

  const [typed, setTyped] = useState("");
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
  const noteTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function later(run: () => void, ms: number) {
    timers.current.push(setTimeout(run, ms));
  }

  // The timers are the only thing that has to be undone on the way out: one
  // still pending would open a result sheet on a screen that has gone.
  useEffect(() => {
    const running = timers.current;
    return () => {
      for (const timer of running) clearTimeout(timer);
      clearTimeout(noteTimer.current);
      timers.current = [];
    };
  }, []);

  function say(text: string) {
    // The note goes on its own rather than being taken away by a later render,
    // and a second note restarts the count instead of inheriting the first's.
    clearTimeout(noteTimer.current);
    setNote({ text, at: Date.now() });
    noteTimer.current = setTimeout(() => setNote(undefined), NOTE_MS);
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

  function setBoard(next: Board) {
    queryClient.setQueryData(boardKey, next);
    saveBoardSnapshot(track, next);
  }

  const guess = useMutation({
    // The board read fired on mount is still out while the first Guess of a
    // warm Track goes, and landing after it would put the pre-Guess board back
    // — mid-flip, with `revealing` pointing at a row that no longer exists.
    // Cancelling is what makes the write below the last word.
    onMutate: () => queryClient.cancelQueries({ queryKey: boardKey }),
    mutationFn: async (word: string): Promise<Submitted> => {
      const key = keyForGuess(word);
      try {
        return await submitGuess(track, word, key);
      } catch (failure) {
        // A Guess never creates a Game (ADR 0022), so the first one on a Track
        // is answered with a 401 until there is a Game to attach it to. Only a
        // current board may start one here; an old board must ask for a refresh.
        if (!(failure instanceof ApiError) || failure.code !== "NO_GAME_TOKEN") throw failure;
        if (board?.day !== wordlexDay()) {
          throw new ApiError("BOARD_EXPIRED", "this board belongs to an earlier WordleX Day");
        }
        await startGame(track, keyForStart());
        // The same key goes out again — a second uuid would spend a second row.
        return await submitGuess(track, word, key);
      }
    },
    onSuccess: (submitted) => {
      // The server answered, so the key has done its job.
      guessKey.current = undefined;

      setBoard(submitted.game);

      // Not an error and not a Guess — our Dictionary is missing a word, and
      // the API has written it down (ADR 0009). The row is not spent.
      if (submitted.outcome === "unknown_word") {
        return refuse("Not in our Dictionary yet. Noted.");
      }

      const next = submitted.game;
      setTyped("");
      if (stillness()) return settle(next);
      setRevealing(next.guesses.length - 1);
      later(() => {
        setRevealing(undefined);
        settle(next);
      }, revealMs(length));
    },
    onError: (failure) => {
      // Nothing the API can do lands here — only the browser can, and
      // `crypto.randomUUID` outside a secure context is the way it happens.
      if (!(failure instanceof ApiError)) return say("Something went wrong.");

      // The key is kept only where the server never answered, which is the case
      // a retry has to collapse. `unsent` below reads the same condition, so the
      // message and the key that makes it safe say the same thing.
      if (failure.code !== "UNREACHABLE") guessKey.current = undefined;

      // The one failure that carries state: `details.game` is the finished
      // board, so there is nothing more to ask for.
      if (failure.code === "GAME_OVER") {
        const ended = (failure.details as { game?: Board } | undefined)?.game;
        if (ended) {
          setBoard(ended);
          setTyped("");
          setSheet(true);
        }
        return;
      }
      // `UNREACHABLE` says its piece through `unsent`, which stands under the
      // board until it is acted on rather than going after a second and a half.
      if (failure.code !== "UNREACHABLE") say(trouble(failure.code));
    },
  });

  /**
   * A Guess that went out and did not come back. Only `UNREACHABLE` earns this:
   * it is the one failure where the same Idempotency-Key is kept, so pressing
   * Enter again re-sends the same Guess and cannot spend a second row. Every
   * other code means the server answered, and a note that goes is right for
   * those — there is nothing a second Enter would change.
   */
  const unsent = guess.error instanceof ApiError && guess.error.code === "UNREACHABLE";

  /**
   * The message stands in the rows the board is not using (ADR 0029), so it is
   * only a message while there is no board to stand in for. A read that failed
   * behind a board already on screen keeps that board: it is the last thing the
   * server said and it is still worth playing.
   *
   * `at` for the same reason a note carries one: two failures in a row are the
   * same sentence, and an alert already on screen saying it again is silence.
   * Remounting it is what gets it read out.
   */
  const problem =
    board === undefined && error instanceof ApiError
      ? { code: error.code, text: trouble(error.code), at: errorUpdatedAt }
      : undefined;

  const guesses = board?.guesses ?? [];
  const over = board !== undefined && board.status !== "playing";

  /** Only rows that have finished turning have reached the keyboard. */
  const keyMarks = new Map<string, Mark>();
  for (const played of revealing === undefined ? guesses : guesses.slice(0, revealing)) {
    for (const [i, letter] of [...played.word.toUpperCase()].entries()) {
      const mark = played.marks[i];
      const held = keyMarks.get(letter);
      if (mark !== undefined && (held === undefined || RANK[mark] > RANK[held])) {
        keyMarks.set(letter, mark);
      }
    }
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
    if (board === undefined || over || guess.isPending || revealing !== undefined) return;
    if (input === "ENTER") {
      if (board.day !== wordlexDay()) return refuse(trouble("BOARD_EXPIRED"));
      if (typed.length < length) return refuse("Not enough Tiles.");
      return guess.mutate(typed);
    }
    // Editing the row makes the failure stale — "press Enter to try again" is
    // about the word that did not send, not whatever is being typed now. Only
    // a press that actually changes the row counts: in the unsent state the
    // row is always full, so a letter is a no-op, and it must not take the
    // message with it. `reset` is what clears it, since the message is the
    // mutation's own error rather than a flag beside it.
    if (input === "DEL") {
      guess.reset();
      return setTyped((it) => it.slice(0, -1));
    }
    if (typed.length < length) guess.reset();
    setTyped((it) => (it.length >= length ? it : it + input));
  }

  return {
    board,
    problem,
    reading,
    unsent,
    budget,
    guesses,
    typed,
    over,
    pending: guess.isPending,
    revealing,
    hopping,
    shaking,
    note,
    sheet,
    keyMarks,
    press,
    // Guarded rather than disabled: a disabled control loses focus mid-click,
    // so a player who got here by keyboard would have to tab back from the top
    // of the document to try a second time.
    retry: () => {
      if (reading) return;
      void refetch();
    },
    openSheet: () => setSheet(true),
    closeSheet: () => setSheet(false),
    endShake: () => setShaking(false),
  };
}
