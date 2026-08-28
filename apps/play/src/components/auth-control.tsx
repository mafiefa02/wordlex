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
import { SignInPanel } from "@wordlex/ui/components/sign-in-panel";
import { Skeleton } from "@wordlex/ui/components/skeleton";
import { cn } from "@wordlex/ui/lib/utils";
import { type Account, readAccount } from "@/lib/api";
import { signInWithGoogle, signOut } from "@/lib/auth";

async function end() {
  await signOut();
  // Reload rather than clear the state locally: the header then re-derives who
  // this is from the API, so it cannot claim a sign-out that did not happen.
  window.location.reload();
}

/**
 * A dialog rather than a link out to the landing page: signing in from the
 * board comes straight back to the Track being played, and today's Games come
 * with it (ADR 0027) — a trip through another origin would lose the URL that
 * says which Track this is.
 */
function SignInDialog() {
  return (
    <Dialog>
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
        Sign in
      </DialogTrigger>
      <DialogContent className="sm:max-w-100">
        {/* The panel carries its own heading; these name the dialog for
            assistive tech without printing the words twice. */}
        <DialogTitle className="sr-only">Sign in to WordleX</DialogTitle>
        <DialogDescription className="sr-only">
          Signing in with Google is what makes your Account.
        </DialogDescription>
        {/* Come back to this Track, mid-Game and all. */}
        <SignInPanel onStart={() => signInWithGoogle(window.location.href)} />
      </DialogContent>
    </Dialog>
  );
}

function AccountMenu({ account }: { account: Account }) {
  return (
    <Popover>
      <PopoverTrigger className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <Avatar size="sm">
          {account.image ? <AvatarImage src={account.image} alt="" /> : null}
          <AvatarFallback>{account.name.trim().charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="sr-only">Your Account</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-medium">{account.name}</p>
          <p className="truncate text-xs text-muted-foreground">{account.email}</p>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={end}>
          Sign out
        </Button>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Signed out this is the sign-in control; signed in it is the Account's avatar
 * — the same pair the landing page's header carries, so the two origins do not
 * look like two products.
 *
 * Which one cannot be known here: the session cookie is on the API's origin and
 * this app is server-rendered, so the answer only arrives on mount. Until it
 * does the space is a skeleton of the control rather than a gap — the header
 * settles into itself instead of a button appearing out of nowhere beside the
 * date.
 */
export function AuthControl() {
  const [account, setAccount] = useState<Account | null>(null);
  const [asked, setAsked] = useState(false);

  useEffect(() => {
    let live = true;
    readAccount()
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

  // The control it will most likely become, drawn as a skeleton: same size, same
  // place, so what arrives settles into the space rather than appearing beside
  // it. The label is still in there, transparent — it is what makes the width
  // exactly right rather than a number that has to be kept in step with the
  // word. Signed out is the commoner state to guess at, since a Player needs no
  // Account to play (ADR 0007); a signed-in header narrows to the avatar.
  if (!asked) {
    return (
      <Skeleton
        aria-hidden
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "border-transparent bg-muted text-transparent",
        )}
      >
        Sign in
      </Skeleton>
    );
  }
  return account ? <AccountMenu account={account} /> : <SignInDialog />;
}
