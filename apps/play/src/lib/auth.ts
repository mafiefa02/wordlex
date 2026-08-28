import { base } from "@/lib/api";

/**
 * Starting a session and ending one, from the board. Asking *who* is signed in
 * is not here — that is `readAccount` in `lib/api.ts`, because `GET /me` speaks
 * the envelope (ADR 0023) and `/api/auth/*` is the one route that does not.
 *
 * Both calls have to run in the browser. The API rejects any non-GET whose
 * `Origin` is not allowlisted (ADR 0006), and this app's server sends no Origin
 * at all — so a sign-in started during SSR fails with a 403 that looks like a
 * CORS problem and is not one.
 */

/**
 * Google's leg and the callback are top-level navigations, so the returned URL
 * is assigned rather than fetched. Resolves only if the redirect never happens.
 *
 * `callbackURL` is bounded by the same allowlist, so this app's origin has to
 * be in `ALLOWED_ORIGINS` for a sign-in started here to come back here.
 */
export async function signInWithGoogle(callbackURL: string): Promise<void> {
  const response = await fetch(`${base}/api/auth/sign-in/social`, {
    method: "POST",
    credentials: "include",
    // Without this the API's body parser leaves the body undefined and the
    // bridge forwards nothing, which better-auth rejects.
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "google", callbackURL }),
  });

  const body: { url?: string } = await response.json();
  if (!body.url) throw new Error("Sign-in did not come back with a redirect.");
  window.location.href = body.url;
}

/**
 * Swallows its own failure, because the caller reloads either way: the header
 * re-asks the API who this is, so a sign-out that did not land shows as still
 * signed in rather than as a UI that lies.
 */
export async function signOut(): Promise<void> {
  try {
    await fetch(`${base}/api/auth/sign-out`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  } catch {
    // Nothing to do here — the reload settles it.
  }
}
