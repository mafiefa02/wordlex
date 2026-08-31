import { wordlexDay, type Mark } from "@wordlex/domain";
import type { Board, Track } from "./api";

const PREFIX = "wordlex:board:v1:";

type BoardSnapshot = {
  version: 1;
  savedAt: number;
  board: Board;
};

function keyFor({ language, length }: Track) {
  return `${PREFIX}${language}:${length}`;
}

function isMark(value: unknown): value is Mark {
  return value === "exact" || value === "present" || value === "absent";
}

function isBoard(value: unknown): value is Board {
  if (typeof value !== "object" || value === null) return false;
  const board = value as Record<string, unknown>;
  if (
    typeof board.day !== "string" ||
    !["playing", "won", "lost", "abandoned"].includes(String(board.status)) ||
    !Array.isArray(board.guesses) ||
    ("answer" in board && board.answer !== undefined && typeof board.answer !== "string")
  ) {
    return false;
  }
  return board.guesses.every((guess) => {
    if (typeof guess !== "object" || guess === null) return false;
    const played = guess as Record<string, unknown>;
    return (
      typeof played.word === "string" && Array.isArray(played.marks) && played.marks.every(isMark)
    );
  });
}

function isBoardSnapshot(value: unknown): value is BoardSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const snapshot = value as Record<string, unknown>;
  return snapshot.version === 1 && Number.isFinite(snapshot.savedAt) && isBoard(snapshot.board);
}

/** Reads a current-WordleX-Day board, or falls back to the normal API read. */
export function readBoardSnapshot(track: Track): Board | undefined {
  if (typeof window === "undefined") return undefined;
  const key = keyFor(track);
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === null) return undefined;
    const snapshot: unknown = JSON.parse(stored);
    if (!isBoardSnapshot(snapshot) || snapshot.board.day !== wordlexDay()) {
      window.localStorage.removeItem(key);
      return undefined;
    }
    return snapshot.board;
  } catch {
    return undefined;
  }
}

/** Stores only a Board the API has already returned. */
export function saveBoardSnapshot(track: Track, board: Board) {
  if (typeof window === "undefined") return;
  try {
    const snapshot: BoardSnapshot = { version: 1, savedAt: Date.now(), board };
    window.localStorage.setItem(keyFor(track), JSON.stringify(snapshot));
  } catch {
    // Storage can be unavailable or full; the network-only board still works.
  }
}

export function clearBoardSnapshot(track: Track) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(keyFor(track));
  } catch {
    // A failed cleanup must not interrupt sign-out or rollover.
  }
}

export function clearBoardSnapshots() {
  if (typeof window === "undefined") return;
  try {
    const keys = Array.from({ length: window.localStorage.length }, (_, index) =>
      window.localStorage.key(index),
    ).filter((key): key is string => key?.startsWith(PREFIX) ?? false);
    for (const key of keys) window.localStorage.removeItem(key);
  } catch {
    // Never use broad storage clearing: other browser data is not ours.
  }
}
