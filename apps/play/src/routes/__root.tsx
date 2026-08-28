import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCss from "@wordlex/ui/globals.css?url";
import { themeInitScript } from "@wordlex/ui/lib/theme";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "WordleX" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
      { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    // Dark by default, so the markup says so rather than waiting on a script.
    // The script only corrects it for someone who has chosen light, and it sits
    // in the head so that correction lands before first paint. It reads the same
    // cookie the landing page's toggle writes, which is how the choice crosses
    // the two origins — this app only ever reads it, so it needs no domain.
    // `suppressHydrationWarning` is required: the script rewrites the attribute
    // before React hydrates, so the server HTML and the live DOM disagree here
    // by design for anyone on light.
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
