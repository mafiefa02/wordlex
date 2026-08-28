import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What WordleX stores, who else sees it, and how to have it removed.",
};

const UPDATED = "28 August 2026";

export default function Privacy() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-[680px] px-6 py-16 max-sm:py-12">
          <h1 className="text-4xl leading-10 font-semibold tracking-[-0.02em] text-balance">
            Privacy
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated {UPDATED}</p>

          <div className="mt-10 flex flex-col gap-10 text-muted-foreground">
            <section className="flex flex-col gap-3">
              <p>
                WordleX is a daily word game. There are no analytics, no advertising, no third party
                trackers, and nothing is sold or shared. This page says exactly what is stored.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
                Playing without an account
              </h2>
              <p>
                Each Track you open sets one signed, <code>httpOnly</code> cookie named{" "}
                <code>wordlex_game_&lt;language&gt;_&lt;length&gt;</code>, holding an opaque Game
                id. It expires when that WordleX Day ends. There are at most twelve, and they are
                the only thing that identifies you.
              </p>
              <p>
                We keep a record of each Game and each Guess &mdash; the words typed and when. Words
                you type that are not in our Dictionary are recorded too, so a speaker can review
                them and add the ones we are missing.
              </p>
              <p className="text-foreground">
                No name, no email address, no account, and no advertising or analytics identifier.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
                Signing in with Google
              </h2>
              <p>
                From Google we receive your name, email address and profile image URL. The scopes we
                ask for are <code>openid</code>, <code>email</code> and <code>profile</code> and
                nothing else &mdash; we never read Gmail, Drive, contacts, or anything beyond basic
                profile. The OAuth tokens for that connection are stored on our server.
              </p>
              <p>
                Each session records its IP address and browser user-agent string, along with the
                session token and its expiry. Signing in also stores your Games, Guesses, Badges and
                reviewed-word contributions against your Account rather than against a cookie.
              </p>
              <p>
                One session cookie is set, <code>httpOnly</code> and <code>Secure</code>, scoped so
                that signing in once covers the whole site. There are no tracking, advertising or
                analytics cookies.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
                Who else sees it
              </h2>
              <p>
                Google, only for sign-in. Vercel, for hosting in Singapore, plus ordinary request
                logs. Supabase, for the database, in <code>ap-southeast-1</code> (Singapore).
              </p>
              <p className="text-foreground">
                Nobody else. No analytics, no error tracker, no ad network, and nothing sold or
                shared. Your data lives in Singapore.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
                Deleting your Account
              </h2>
              <p>
                Deleting removes the Google connection, the name, the email address, the profile
                image and every session. The gameplay history stays in the database, unlinked from
                any person and unreachable &mdash; signing in again with the same Google account
                starts over at zero. We would rather say that plainly than claim everything is
                erased, because it is not.
              </p>
              <p>
                There is no delete button in the interface yet. To have an Account deleted, write to{" "}
                <a
                  className="text-foreground underline underline-offset-2"
                  href="mailto:mafiefa.business@gmail.com"
                >
                  mafiefa.business@gmail.com
                </a>
                .
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">Children</h2>
              <p>
                WordleX is not directed at children and we do not knowingly collect data from them.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">Changes</h2>
              <p>
                If this policy changes, the new version appears on this page with a new date above.
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
