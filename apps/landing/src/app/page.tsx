import type { Metadata } from "next";

import { buttonVariants } from "@wordlex/ui/components/button";

import { BoardField } from "@/components/board-field";
import { Faq } from "@/components/faq";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TrackCards } from "@/components/track-cards";

const playUrl = process.env.NEXT_PUBLIC_PLAY_URL ?? "http://localhost:3001";

// Set on each indexable page rather than once in the layout: a canonical
// inherited from a parent resolves to the parent's own URL, which would tell a
// crawler that all three pages are the same one.
export const metadata: Metadata = { alternates: { canonical: "/" } };

const STEPS = [
  {
    n: "01",
    title: "Pick a Track",
    body: "A language and a word length. Whichever you open, today's word is already chosen.",
  },
  {
    n: "02",
    title: "Guess the word",
    body: "Word length plus one Guesses. Scoring happens on the server, so the Answer never reaches your browser until the Game is over.",
  },
  {
    n: "03",
    title: "Come back tomorrow",
    body: "One Game per Track, then that Track is done for the day. The next WordleX Day opens at 00:00 WIB.",
  },
];

export default function Home() {
  return (
    <>
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-3 focus:z-10 focus:rounded-md focus:bg-foreground focus:px-3 focus:py-2 focus:text-background"
        href="#main"
      >
        Skip to content
      </a>

      <SiteHeader />

      {/* The board field is wider than the wrap, so the clip has to live on an
          element that spans the viewport. `clip` rather than `hidden`: hidden
          would turn main into a scroll container and break the sticky header. */}
      <main id="main" className="flex-1 overflow-x-clip">
        <div className="mx-auto max-w-[960px] px-6">
          <section className="relative grid gap-12 pt-24 pb-16 max-md:py-12">
            <BoardField />
            <div className="relative">
              <h1 className="mb-6 max-w-[680px] bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-5xl leading-none font-semibold tracking-[-0.02em] text-balance text-transparent max-md:text-4xl max-md:leading-10">
                More than one language.
                <br />
                More than five letters.
              </h1>
              <p className="max-w-[680px] text-lg text-muted-foreground">
                A daily word game with one word per language, per length. Twelve Tracks are open
                today, and more languages are on the way.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a className={buttonVariants({ size: "lg" })} href={playUrl}>
                  Play today&rsquo;s word
                </a>
                <p className="max-w-[280px] text-sm text-muted-foreground">
                  Free. No Account needed to play.
                </p>
              </div>
            </div>
          </section>
        </div>

        <section className="py-16 max-sm:py-12">
          <div className="mx-auto max-w-[960px] px-6">
            <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Twelve Tracks today
            </p>
            <h2 className="mt-2 text-3xl leading-9 font-semibold tracking-[-0.02em] text-balance">
              One language at one word length
            </h2>
            <p className="mt-3 max-w-[680px] text-lg text-muted-foreground">
              That pairing is a Track. All of them open every WordleX Day, and you may play as many
              as you like, once each.
            </p>
            <TrackCards />
          </div>
        </section>

        <section className="border-t border-border py-16 max-sm:py-12">
          <div className="mx-auto max-w-[960px] px-6">
            <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              How it works
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {STEPS.map((step) => (
                <div key={step.n}>
                  <p className="mb-2 text-xs font-semibold text-muted-foreground tabular-nums">
                    {step.n}
                  </p>
                  <h3 className="mb-1 text-base font-semibold tracking-[-0.02em]">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border py-16 max-sm:py-12">
          <div className="mx-auto grid max-w-[960px] gap-12 px-6 sm:grid-cols-2">
            <div>
              <h2 className="text-2xl leading-8 font-semibold tracking-[-0.02em]">
                One day for everyone
              </h2>
              <p className="mt-3 text-muted-foreground">
                A WordleX Day begins at 00:00 WIB, which is UTC+7, the same instant everywhere on
                Earth. Play from London and the word flips at five in the afternoon. The trade is
                that the grid you compare with a friend in Bandung is the grid they played.
              </p>
            </div>
            <div>
              <h2 className="text-2xl leading-8 font-semibold tracking-[-0.02em]">
                An Account is optional
              </h2>
              <p className="mt-3 text-muted-foreground">
                You can play every Track without one. Signing in with Google is what makes a history
                durable: Streaks, Badges and every Game from then on. Google is the only way in, and
                we ask for nothing beyond your name, email and profile picture.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-border py-16 max-sm:py-12">
          <div className="mx-auto max-w-[960px] px-6">
            <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Questions
            </p>
            <Faq />
          </div>
        </section>

        <section className="border-t border-border py-16 max-sm:py-12">
          <div className="mx-auto max-w-[960px] px-6 text-center">
            <h2 className="mx-auto max-w-[680px] text-4xl leading-10 font-semibold tracking-[-0.02em] text-balance">
              Twelve words are waiting. Then you wait too.
            </h2>
            <div className="mt-8">
              <a className={buttonVariants({ size: "lg" })} href={playUrl}>
                Play today&rsquo;s word
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
