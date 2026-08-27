"use client";

import { buttonVariants } from "@wordlex/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@wordlex/ui/components/dialog";

import { SignInPanel } from "./sign-in-panel";

/**
 * The default way in. `/login` exists for people who type it; every control on
 * the site opens this instead, so signing in never costs a page.
 */
export function SignInDialog() {
  return (
    <Dialog>
      <DialogTrigger className={buttonVariants({ variant: "outline" })}>Sign in</DialogTrigger>
      <DialogContent className="sm:max-w-100">
        {/* The panel carries its own heading; these name the dialog for
            assistive tech without printing the words twice. */}
        <DialogTitle className="sr-only">Sign in to WordleX</DialogTitle>
        <DialogDescription className="sr-only">
          Signing in with Google is what makes your Account.
        </DialogDescription>
        <SignInPanel />
      </DialogContent>
    </Dialog>
  );
}
