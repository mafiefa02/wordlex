import Link from "next/link";

import { Logo } from "@wordlex/ui/components/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border pt-8 pb-12">
      <div className="mx-auto flex max-w-[960px] flex-wrap items-center justify-between gap-4 px-6">
        <span className="text-muted-foreground">
          <Logo size={14} mono />
        </span>
        <nav className="flex gap-6 text-sm">
          <Link
            className="text-muted-foreground hover:text-foreground hover:underline"
            href="/privacy"
          >
            Privacy
          </Link>
          <Link className="text-muted-foreground hover:text-foreground hover:underline" href="/tos">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
