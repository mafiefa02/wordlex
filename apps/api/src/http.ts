import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * The one shape every response takes. Successes are `{ data }`, failures are
 * `{ error }`, and the top-level key is the discriminant — a client never has to
 * read the status code to know which of the two it got.
 */
export type ApiSuccess<Data> = { data: Data };

export type ApiFailure = {
  error: {
    /** Machine-readable and stable. Branch on this, never on `message`. */
    code: ErrorCode;
    /** For a human reading a log. Free to be reworded, so never parse it. */
    message: string;
    /** Only where a client needs more than a sentence — see `GAME_OVER`. */
    details?: unknown;
  };
};

export type ApiResponse<Data> = ApiSuccess<Data> | ApiFailure;

/**
 * Every failure the API can send. The status code says what kind of problem it
 * is; the code says which one, because a status is too coarse to render from —
 * `POST /guess` answers both "your body is the wrong shape" and "that is not
 * five characters of a-z" with a 400, and a client wants to show those
 * differently.
 *
 * Codes are added, never repurposed: a client branching on one depends on its
 * meaning the moment it ships.
 */
export type ErrorCode =
  /** 400 — the request did not match the endpoint's schema. */
  | "VALIDATION_ERROR"
  /** 400 — well-formed request, but the word is not N characters of a-z. */
  | "MALFORMED_WORD"
  /** 400 — a write arrived with no usable `Idempotency-Key` (ADR 0024). */
  | "IDEMPOTENCY_KEY_REQUIRED"
  /**
   * 4xx — Fastify refused the request before any handler ran: a malformed JSON
   * body, an unsupported content type, a payload too large. One code for all of
   * them on purpose. The status says which; naming each would be promising a
   * contract over failures this app does not author.
   */
  | "REQUEST_REJECTED"
  /**
   * 401 — there is no Game to attach this to. Anonymously that means no Game
   * token for this Track and today's Daily; signed in it means they have not
   * started this Track today. One code, because the client does the same thing
   * either way: press Play.
   */
  | "NO_GAME_TOKEN"
  /** 401 — the route is a Player's own history, and nobody is signed in. */
  | "NOT_SIGNED_IN"
  /** 403 — a write with a missing or non-allowlisted `Origin`. */
  | "ORIGIN_NOT_ALLOWED"
  /** 404 — no such route. */
  | "NOT_FOUND"
  /** 409 — the Game is over. `details.game` carries the finished board. */
  | "GAME_OVER"
  /**
   * 422 — a key came back with a different request than the one it named. That
   * is a client bug, and it fails loudly rather than replaying the first
   * response, which would answer a question nobody asked (ADR 0024).
   */
  | "IDEMPOTENCY_KEY_REUSED"
  /** 500 — something broke. The reason is in the log, never in the response. */
  | "INTERNAL_ERROR"
  /** 503 — that Track has no Answer Pool, so it has no Daily to play. */
  | "TRACK_UNAVAILABLE"
  /** 503 — the database is unreachable. Only `/health` sends this. */
  | "DATABASE_UNAVAILABLE";

/** Builds a failure body. `details` is omitted rather than sent as null. */
export function fail(code: ErrorCode, message: string, details?: unknown): ApiFailure {
  return { error: { code, message, ...(details === undefined ? {} : { details }) } };
}

/**
 * The `Idempotency-Key` a write carries (ADR 0024). Undefined means the header
 * is missing or is not a uuid, which every write refuses.
 *
 * **A uuid and nothing else, because on `POST /game` this key is a credential.**
 * That endpoint hands back a Game token when a key names a Game already started,
 * which is the whole point — a retry that never received the first response has
 * no token and nothing else to be recognised by. So anyone who can produce the
 * key gets the Game. A readable key derived from the intent, which is the usual
 * advice and what `start:en:5` looks like, would be the same string for every
 * anonymous Player on that Track: the second to press Play would be handed the
 * first one's board and token. ADR 0022 signed the Game token precisely so a
 * browser could not name a Game and claim it, and a guessable key is that hole
 * reopened. Requiring a uuid is what keeps "generate one per press" the only
 * natural way to use this.
 */
const KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function idempotencyKey(request: FastifyRequest): string | undefined {
  const sent = request.headers["idempotency-key"];
  return typeof sent === "string" && KEY.test(sent) ? sent : undefined;
}

/**
 * Says the response body depends on the cookies that were sent. Every GET here
 * is per-Player: the board changes with the Game token, the profile with the
 * session.
 *
 * Appended rather than set, because @fastify/cors has already put `Vary: Origin`
 * here from an onRequest hook and `reply.header` replaces.
 */
export function varyOnCookie(reply: FastifyReply) {
  const vary = reply.getHeader("Vary");
  reply.header("Vary", vary === undefined ? "Cookie" : `${String(vary)}, Cookie`);
}
