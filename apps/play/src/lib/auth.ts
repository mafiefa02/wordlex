import { apiUrl } from "./api";

/**
 * The whole client for a Google-only sign-in (ADR 0025): start it, end it, ask
 * who is signed in. Separate from `api.ts` because `/api/auth/*` is the one
 * route that answers in better-auth's shape rather than the envelope (ADR
 * 0023), so none of this can go through `send`.
 *
 * Every call here has to run in the browser. `apps/api` rejects any non-GET
 * whose `Origin` is not allowlisted, and this app's server sends no Origin at
 * all — so a sign-in started during SSR fails with a 403 that looks like a CORS
 * problem and is not one.
 */

/** What `GET /me` tells us about the signed-in Account. */
export type Account = {
  name: string;
  email: string;
  image: string | null;
};

/**
 * Google's leg and the callback are top-level navigations, so the returned URL
 * is assigned rather than fetched. Resolves only if the redirect never happens.
 */
export async function signInWithGoogle(callbackURL: string): Promise<void> {
  const response = await fetch(`${apiUrl}/api/auth/sign-in/social`, {
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
    await fetch(`${apiUrl}/api/auth/sign-out`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  } catch {
    // Nothing to do here — the reload settles it.
  }
}

/**
 * `null` when nobody is signed in — the API answers 401 there, not an error.
 * A network failure lands in the same place on purpose: if the API cannot be
 * reached we do not know who this is, and offering to sign in is the safe way
 * to be wrong.
 */
export async function getAccount(): Promise<Account | null> {
  try {
    const response = await fetch(`${apiUrl}/me`, { credentials: "include" });
    if (!response.ok) return null;

    const body: { data?: { account?: Account } } = await response.json();
    return body.data?.account ?? null;
  } catch {
    return null;
  }
}
