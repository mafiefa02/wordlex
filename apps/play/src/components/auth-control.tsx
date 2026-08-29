import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@wordlex/ui/components/avatar";
import { Button, buttonVariants } from "@wordlex/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@wordlex/ui/components/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@wordlex/ui/components/popover";
import { cn } from "@wordlex/ui/lib/utils";
import { type Account, getAccount, signInWithGoogle, signOut } from "@/lib/auth";
import { siteUrl } from "@/lib/site";

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
 * Google is the only way in (ADR 0025), so there is no second field and no
 * separate sign-up: a first sign-in is what makes the Account.
 */
function SignInDialog() {
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);

  async function start() {
    setFailed(false);
    setPending(true);
    try {
      // Come back to the Track they were on when they asked to sign in.
      await signInWithGoogle(window.location.href);
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  // The root stays mounted whether or not it is open, so closing has to clear
  // the last attempt — otherwise reopening shows a failure that belongs to a
  // try the player has already walked away from.
  function reset() {
    setFailed(false);
    setPending(false);
  }

  return (
    <Dialog onOpenChange={(open) => !open && reset()}>
      <DialogTrigger className={buttonVariants({ variant: "outline" })}>Sign in</DialogTrigger>
      {/* Focus is not handed back to the trigger on close. This whole screen is
          driven by a window-level key listener, and a focused button owns Enter
          — so restoring focus here would quietly stop a row being submitted
          with the key that submits rows. Focus falls to the document, which is
          where the board reads from. */}
      <DialogContent className="sm:max-w-90" finalFocus={false}>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <DialogTitle className="text-2xl font-semibold tracking-[-0.02em]">
              Sign in to WordleX
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              An Account is what makes a history last beyond the day — Streaks and Badges, kept.
              Today&rsquo;s Games come with you.
            </DialogDescription>
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

          <p className="text-xs text-muted-foreground">
            By signing in you agree to the{" "}
            <a
              className="underline underline-offset-2 hover:text-foreground"
              href={`${siteUrl}/tos`}
            >
              terms
            </a>{" "}
            and the{" "}
            <a
              className="underline underline-offset-2 hover:text-foreground"
              href={`${siteUrl}/privacy`}
            >
              privacy policy
            </a>
            .
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

async function end() {
  await signOut();
  // Reload rather than clear the state locally: the header then re-derives who
  // this is from the API, and the board re-reads as whoever is left.
  window.location.reload();
}

function AccountMenu({ account }: { account: Account }) {
  return (
    <Popover>
      <PopoverTrigger className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <Avatar>
          {account.image ? <AvatarImage src={account.image} alt="" /> : null}
          <AvatarFallback>{account.name.trim().charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="sr-only">Your Account</span>
      </PopoverTrigger>
      {/* Same reason as the sign-in dialog above. */}
      <PopoverContent align="end" className="w-56 p-1" finalFocus={false}>
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium">{account.name}</p>
          <p className="truncate text-xs text-muted-foreground">{account.email}</p>
        </div>
        {/* A list from the start: the profile entry lands here next. */}
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={end}>
          Sign out
        </Button>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Signed out this is the sign-in control; signed in it is the Account's avatar.
 * Which one cannot be known while the page is rendered — the session cookie is
 * on the API's origin — so the space is held until the answer arrives rather
 * than showing a spinner. Signing in is the rarer state, so the placeholder
 * matches the signed-out control and only a signed-in header narrows on load.
 */
export function AuthControl() {
  const [account, setAccount] = useState<Account | null>(null);
  const [asked, setAsked] = useState(false);

  useEffect(() => {
    let live = true;
    getAccount()
      .then((found) => {
        if (live) setAccount(found);
      })
      .finally(() => {
        if (live) setAsked(true);
      });
    return () => {
      live = false;
    };
  }, []);

  // The sign-in button's own box, filled rather than drawn: `text-transparent`
  // keeps the label in the layout, so the skeleton is exactly the width of the
  // control it stands in for instead of a guess at it. Deliberately not
  // animated — a pulse here would repaint for the whole of a fetch nobody is
  // waiting on.
  if (!asked) {
    return (
      <span
        className={cn(
          buttonVariants({ variant: "outline" }),
          "border-transparent bg-muted text-transparent dark:border-transparent dark:bg-muted",
        )}
        aria-hidden
      >
        Sign in
      </span>
    );
  }
  return account ? <AccountMenu account={account} /> : <SignInDialog />;
}
