import Link from "next/link";

import { GitHubIcon, GlobeIcon, LinkedInIcon } from "@wordlex/ui/components/social-icons";
import { buttonVariants } from "@wordlex/ui/components/button";
import { Logo } from "@wordlex/ui/components/logo";
import { ThemeToggle } from "@wordlex/ui/components/theme-toggle";

// Icon-only, so the label is the accessible name rather than decoration. The
// globe is stroked where the brand marks are filled, so it takes lucide's 16px
// to weigh the same as their 14px.
const socials = [
  { label: "GitHub", href: "https://github.com/mafiefa02", icon: <GitHubIcon /> },
  { label: "LinkedIn", href: "https://linkedin.com/in/mafiefa", icon: <LinkedInIcon /> },
  {
    label: "Personal Website",
    href: "https://afiefabd.com/",
    icon: <GlobeIcon className="size-4" />,
  },
];

// Unset locally, where every app is on `localhost` and a domain-scoped cookie
// is neither needed nor accepted.
const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;

const iconLink = buttonVariants({
  variant: "ghost",
  size: "icon-sm",
  className: "text-muted-foreground",
});

export function SiteFooter() {
  return (
    <footer className="border-t border-border pt-8 pb-12">
      <div className="mx-auto flex max-w-[960px] flex-wrap items-center justify-between gap-4 px-6">
        <span className="text-muted-foreground">
          <Logo size={14} mono />
        </span>
        <nav className="flex items-center gap-6 text-sm">
          <Link
            className="text-muted-foreground hover:text-foreground hover:underline"
            href="/privacy"
          >
            Privacy
          </Link>
          <Link className="text-muted-foreground hover:text-foreground hover:underline" href="/tos">
            Terms
          </Link>
          {/* The negative margin keeps the 28px controls from growing the row. */}
          <div className="-my-1 flex items-center gap-0.5">
            {socials.map(({ label, href, icon }) => (
              <a
                key={label}
                className={iconLink}
                href={href}
                aria-label={label}
                target="_blank"
                rel="noreferrer"
              >
                {icon}
              </a>
            ))}
            <ThemeToggle className="text-muted-foreground" cookieDomain={cookieDomain} />
          </div>
        </nav>
      </div>
    </footer>
  );
}
