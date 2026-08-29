import type { Language, Length, Mark, WordlexDay } from "@wordlex/domain";

/**
 * The API is a separate origin (ADR 0006), so every call here is cross-origin
 * and carries cookies — the session and the per-Track Game token both live on
 * the API's host. That is also why the board cannot be server-rendered: the
 * Game token is `httpOnly` and host-only to the API, so this app's server never
 * sees it and only the browser can ask what the board looks like.
 *
 * The fallback is for `pnpm dev` with no `.env`. It cannot reach a deployment:
 * `vite.config.ts` fails the build when `VITE_API_URL` is unset.
 */
export const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

/** Today's Daily for a Track, and where this Player stands on it. */
export type Board = {
  day: WordlexDay;
  status: "playing" | "won" | "lost" | "abandoned";
  guesses: { word: string; marks: Mark[] }[];
  /** Only ever present once the Game is over (ADR 0003). */
  answer?: string;
};

/**
 * The failure codes this app branches on. The full list lives in
 * `apps/api/src/http.ts` and is deliberately not copied here — anything else
 * shows its message and is otherwise treated the same, which is why the union
 * stays open.
 */
export type ErrorCode =
  | "NO_GAME_TOKEN"
  | "GAME_OVER"
  | "MALFORMED_WORD"
  | "TRACK_UNAVAILABLE"
  /** Not the API's: the request never got there. */
  | "UNREACHABLE"
  | (string & {});

/**
 * The error half of the envelope (ADR 0023), thrown rather than returned: every
 * call here is a TanStack Query query or mutation, and a rejected promise is
 * how Query is told something went wrong (ADR 0031). Callers branch on `code`.
 */
export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    /** Only `GAME_OVER` carries anything, and what it carries is the finished Board. */
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Envelope<Data> =
  | { data: Data }
  | { error: { code: string; message: string; details?: unknown } };

async function send<Data>(path: string, init?: RequestInit): Promise<Data> {
  let body: Envelope<Data>;
  try {
    const response = await fetch(`${apiUrl}${path}`, { credentials: "include", ...init });
    body = await response.json();
  } catch {
    // A network failure and a 500 are the same thing to a player: try again.
    throw new ApiError("UNREACHABLE", "Could not reach the game.");
  }
  if ("error" in body) {
    throw new ApiError(body.error.code, body.error.message, body.error.details);
  }
  return body.data;
}

/** Every write carries a uuid the caller owns for the length of one intent. */
function write(key: string, payload: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify(payload),
  };
}

export type Track = { language: Language; length: Length };

/** Reads only. Creates no Game and sets no cookie, so pressing nothing is free. */
export async function readBoard({ language, length }: Track) {
  const { game } = await send<{ game: Board }>(`/daily/${language}/${length}`);
  return game;
}

/** The only thing that creates a Game (ADR 0022). Hands back the Game token. */
export async function startGame(track: Track, key: string) {
  const { game } = await send<{ game: Board }>("/game", write(key, track));
  return game;
}

/**
 * A submission is either scored or an Unknown Word, and the second is a 200:
 * nothing was wrong, our Dictionary is just missing a word. Branch on `outcome`
 * before anything else.
 */
export type Submitted =
  | { outcome: "scored"; game: Board }
  | { outcome: "unknown_word"; word: string; game: Board };

export function submitGuess(track: Track, word: string, key: string) {
  return send<Submitted>("/guess", write(key, { ...track, word }));
}
