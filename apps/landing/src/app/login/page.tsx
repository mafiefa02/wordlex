import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@wordlex/ui/components/logo";

import { BoardField } from "@/components/board-field";
import { SignInPanel } from "@/components/sign-in-panel";

export const metadata: Metadata = {
  title: "Sign in",
  // Nothing links here — the dialog is the way in. A page reached only by
  // typing it has no business in a search index.
  robots: { index: false, follow: false },
};

export default function Login() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-8 p-8">
        <Link
          className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          href="/"
        >
          <Logo size={18} markOnly />
          Back to WordleX
        </Link>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-90">
            <SignInPanel />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          By signing in you agree to the{" "}
          <Link className="underline underline-offset-2 hover:text-foreground" href="/tos">
            terms
          </Link>{" "}
          and the{" "}
          <Link className="underline underline-offset-2 hover:text-foreground" href="/privacy">
            privacy policy
          </Link>
          .
        </p>
      </div>

      {/* The board field is built for a full-width hero, so here it is simply
          clipped to the column — a slice of the same texture rather than a
          second decoration to maintain. */}
      <div className="relative hidden overflow-hidden border-l border-border lg:block">
        <BoardField contained />
      </div>
    </div>
  );
}
