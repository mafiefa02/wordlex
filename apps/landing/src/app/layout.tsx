import type { Metadata } from "next";

import { themeInitScript } from "@wordlex/ui/lib/theme";

import { siteUrl } from "@/lib/site";

import "./globals.css";

const description =
  "A daily word game in English, Bahasa Indonesia, Basa Sunda and Basa Jawa, at five, six and seven letters.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "WordleX", template: "%s — WordleX" },
  description,
  // No `icons` block: icon.svg, apple-icon.png and favicon.ico already sit in
  // this directory and Next picks them up by filename. Declaring them here
  // would emit two of each.

  // Only the parts that are the same on every page. Metadata merges shallowly,
  // so a page setting just a title inherits this whole block — and a `title`,
  // `description` or `url` pinned here would win over that page's own, leaving
  // `/privacy` unfurling as the homepage. Left out, Next fills each from the
  // page's own resolved values.
  //
  // No `twitter` block either: it is filled from this one, and `card` already
  // defaults to `summary_large_image` once an image resolves.
  openGraph: {
    type: "website",
    siteName: "WordleX",
    locale: "en_US",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Dark by default, so the markup says so rather than waiting on a script.
    // `suppressHydrationWarning` is required, not cosmetic: the script below
    // rewrites this attribute before React hydrates, so for anyone on light the
    // server HTML and the live DOM disagree here by design.
    // The script only runs to correct it for someone who has chosen light, and
    // it sits in the head so that correction lands before first paint.
    <html lang="en" data-theme="dark" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
