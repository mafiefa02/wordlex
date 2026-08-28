"use client";

import { SignInPanel as Panel } from "@wordlex/ui/components/sign-in-panel";

import { signInWithGoogle } from "@/lib/auth";

/**
 * The panel itself lives in `@wordlex/ui`, because the play app's header signs
 * people in with the same one. All this app adds is how a sign-in starts here:
 * its own API origin, and coming back to wherever they were when they asked.
 */
export function SignInPanel() {
  return <Panel onStart={() => signInWithGoogle(window.location.href)} />;
}
