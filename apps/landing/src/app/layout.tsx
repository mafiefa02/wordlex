import type { Metadata } from "next";
import "./globals.css";

const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const description =
  "A daily word game in English, Bahasa Indonesia, Basa Sunda and Basa Jawa, at five, six and seven letters.";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "WordleX", template: "%s — WordleX" },
  description,
  // No `icons` block: icon.svg, apple-icon.png and favicon.ico already sit in
  // this directory and Next picks them up by filename. Declaring them here
  // would emit two of each.
  openGraph: {
    type: "website",
    siteName: "WordleX",
    title: "WordleX",
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
