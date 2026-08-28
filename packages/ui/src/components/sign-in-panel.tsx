"use client";

import { useState } from "react";

import { Button } from "@wordlex/ui/components/button";

/** Google requires its own mark on the button that starts a Google sign-in. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className="size-4">
      <path
        fill="#4285F4"
        d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8a10 10 0 0 1-4.4 6.6v5.5h7.1c4.1-3.8 6.6-9.4 6.6-16.3z"
      />
      <path
        fill="#34A853"
        d="M24 46c6 0 11-2 14.5-5.2l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7A22 22 0 0 0 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.8 28.4a13.2 13.2 0 0 1 0-8.4v-5.7H4.5a22 22 0 0 0 0 19.8l7.3-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 9.5c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 2.9 30 1 24 1A22 22 0 0 0 4.5 14.3l7.3 5.7c1.7-5.2 6.5-9 12.2-9z"
      />
    </svg>
  );
}

/**
 * The whole sign-in flow, and the only copy of it — the landing page's dialog,
 * its `/login`, and the play app's header all render this, so no two surfaces
 * can drift on the wording or on what a sign-in costs.
 *
 * Google is the only way in (ADR 0025), so there is no second field and no
 * separate sign-up: a first sign-in is what makes the Account.
 *
 * Starting it is the caller's, because the API's origin is an app-level env var
 * and the two apps spell it differently — this package may not read either.
 */
export function SignInPanel({ onStart }: { onStart: () => Promise<void> }) {
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);

  async function start() {
    setFailed(false);
    setPending(true);
    try {
      await onStart();
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-[-0.02em]">Sign in to WordleX</h2>
        <p className="text-sm text-muted-foreground">
          An Account is what makes a history last beyond the day — Streaks and Badges, kept.
        </p>
      </div>

      <Button size="lg" className="w-full" onClick={start} disabled={pending}>
        <GoogleMark />
        Continue with Google
      </Button>

      {failed ? (
        <p className="text-sm text-destructive" role="alert">
          That did not go through. Try again in a moment.
        </p>
      ) : null}

      <p className="text-sm text-muted-foreground">
        First time here? Signing in is what makes your Account. You can play all twelve Tracks
        without one, today and every day.
      </p>
    </div>
  );
}
