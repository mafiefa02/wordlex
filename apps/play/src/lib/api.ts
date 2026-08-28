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
 *
 * Exported for `lib/auth.ts`, which talks to the same origin but not through
 * `send` — `/api/auth/*` answers in better-auth's shape, not the envelope.
 */
export const base = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

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
 * The envelope (ADR 0023) turned into something worth branching on. Callers ask
 * `ok` rather than reading a status code, which is what the envelope was for.
 */
export type Result<Data> =
  | { ok: true; data: Data }
  | { ok: false; code: ErrorCode; message: string; details?: unknown };

type Envelope<Data> =
  | { data: Data }
  | { error: { code: string; message: string; details?: unknown } };

async function send<Data>(path: string, init?: RequestInit): Promise<Result<Data>> {
  let body: Envelope<Data>;
  try {
    const response = await fetch(`${base}${path}`, { credentials: "include", ...init });
    body = await response.json();
  } catch {
    // A network failure and a 500 are the same thing to a player: try again.
    return { ok: false, code: "UNREACHABLE", message: "Could not reach the game." };
  }
  return "error" in body
    ? { ok: false, code: body.error.code, message: body.error.message, details: body.error.details }
    : { ok: true, data: body.data };
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
export function readBoard({ language, length }: Track) {
  return send<{ game: Board }>(`/daily/${language}/${length}`);
}

/** The only thing that creates a Game (ADR 0022). Hands back the Game token. */
export function startGame(track: Track, key: string) {
  return send<{ game: Board }>("/game", write(key, track));
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

/** What `GET /me` says about the Account whose session this browser holds. */
export type Account = {
  name: string;
  email: string;
  image: string | null;
};

/**
 * Who is signed in, or `null` for nobody — the API answers 401 there, which is
 * an answer rather than a failure. An unreachable API lands in the same place
 * on purpose: not knowing who this is and offering to sign in is the safe way
 * to be wrong.
 *
 * `/me` carries the Streak and the Badges too; this app reads neither yet, so
 * only the half it uses is typed here.
 */
export async function readAccount(): Promise<Account | null> {
  const result = await send<{ account: Account }>("/me");
  return result.ok ? result.data.account : null;
}
