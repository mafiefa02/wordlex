"use client";

import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@wordlex/ui/components/avatar";
import { Button, buttonVariants } from "@wordlex/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@wordlex/ui/components/popover";
import { cn } from "@wordlex/ui/lib/utils";

import { type Account, getAccount, signOut } from "@/lib/auth";

import { SignInDialog } from "./sign-in-dialog";

async function end() {
  await signOut();
  // Reload rather than clear the state locally: the header then re-derives who
  // this is from the API, so it cannot claim a sign-out that did not happen.
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
      <PopoverContent align="end" className="w-56 p-1">
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
 * Which one cannot be known on the server — the session cookie is on the API's
 * origin — so the space is held until the answer arrives rather than showing a
 * spinner. Signing in is the rarer state, so the placeholder matches the
 * signed-out control and only a signed-in header narrows on load.
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

  // An invisible copy of the control it will most likely become, so the header
  // reserves exactly the right width instead of a guess at it.
  if (!asked) {
    return (
      <span className={cn(buttonVariants({ variant: "outline" }), "invisible")} aria-hidden>
        Sign in
      </span>
    );
  }
  return account ? <AccountMenu account={account} /> : <SignInDialog />;
}
