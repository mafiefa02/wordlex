import Link from "next/link";

import { buttonVariants } from "@wordlex/ui/components/button";
import { Logo } from "@wordlex/ui/components/logo";

const playUrl = process.env.NEXT_PUBLIC_PLAY_URL ?? "http://localhost:3001";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-5 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[960px] items-center justify-between gap-4 px-6">
        <Link href="/" aria-label="WordleX home">
          <Logo size={26} />
        </Link>
        <a className={buttonVariants({ variant: "default" })} href={playUrl}>
          Play today
        </a>
      </div>
    </header>
  );
}
