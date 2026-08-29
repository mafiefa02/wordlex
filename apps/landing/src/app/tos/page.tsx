import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms you play WordleX under.",
  alternates: { canonical: "/tos" },
};

const UPDATED = "28 August 2026";

export default function Terms() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-[680px] px-6 py-16 max-sm:py-12">
          <h1 className="text-4xl leading-10 font-semibold tracking-[-0.02em] text-balance">
            Terms
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated {UPDATED}</p>

          <div className="mt-10 flex flex-col gap-10 text-muted-foreground">
            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
                What this is
              </h2>
              <p>
                WordleX is a daily word game in English, Bahasa Indonesia, Basa Sunda and Basa Jawa,
                at five, six and seven letters. It is free to play, with or without an Account.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
                Provided as-is
              </h2>
              <p>
                The game is provided as-is and without warranty. It may be unavailable, lose data,
                or change at any time. Nothing here is a guarantee that a Game, a Streak or a Badge
                will survive.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
                The words
              </h2>
              <p>
                Our Dictionaries and Answer Pools are derived from public sources. They contain
                mistakes, and they are thinner in some languages than others. A word you know may be
                missing; that is an Unknown Word, and it is written down so a speaker can review it.
                Nothing about a word appearing here is a claim about its correctness.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">Accounts</h2>
              <p>
                Signing in is through Google and nothing else. An Account may be closed for abuse
                &mdash; automated play, attempts to extract Answers, or anything that degrades the
                game for other Players. You may have your own Account deleted at any time; see the{" "}
                <Link
                  className="underline underline-offset-2 hover:text-foreground"
                  href="/privacy"
                >
                  privacy policy
                </Link>{" "}
                for what that removes and what it leaves.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">Changes</h2>
              <p>
                These terms can change. The new version appears on this page with a new date above,
                and continuing to play is how you accept it.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-xl font-semibold tracking-[-0.02em] text-foreground">
                Governing law
              </h2>
              <p>
                These terms are governed by the laws of the Republic of Indonesia, and any dispute
                about them belongs to the Indonesian courts.
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
