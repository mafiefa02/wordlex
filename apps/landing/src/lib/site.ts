/**
 * The landing page's own origin, and the base every canonical, social card and
 * sitemap URL is built on.
 *
 * `NEXT_PUBLIC_*` is inlined at build time, so a production build with this
 * unset would bake `localhost` into the sitemap we hand to a search engine and
 * into every canonical — telling it the real pages live on a host it cannot
 * reach. There is no runtime signal for that, so the build is where it has to
 * fail, the same way `apps/play` fails on a missing `VITE_API_URL`.
 *
 * Dev keeps the fallback: there is no `.env` in this app, only `.env.example`.
 */
const configured = process.env.NEXT_PUBLIC_SITE_URL;

if (process.env.NODE_ENV === "production" && !configured) {
  throw new Error("NEXT_PUBLIC_SITE_URL is not set — see apps/landing/.env.example.");
}

/*
  The trailing slash is stripped because this value is used two ways that
  disagree about it: `new URL()` in `metadataBase` normalises `.../` away, plain
  concatenation in the sitemap does not. Left in, a value ending in a slash
  would emit `//privacy` to a crawler while every canonical stayed correct —
  wrong only in the files nobody opens.
*/
export const siteUrl = (configured ?? "http://localhost:3000").replace(/\/$/, "");
