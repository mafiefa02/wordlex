import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

/**
 * The opposite of `apps/play/public/robots.txt`, and deliberately: this is the
 * surface search should find. The play app is a board that only exists once a
 * Player asks for it, so it asks to be left alone; this page is what describes
 * the game to someone who has not played it.
 *
 * Nothing is disallowed, and `/login` is the one that looks like it should be.
 * It carries `robots: { index: false }`, and a `Disallow` here would be the
 * wrong way to help: it stops the fetch, so the crawler never reads the tag,
 * and a URL found through an external link can still be indexed as a bare URL
 * with no content. The two cancel rather than reinforce. Letting the page be
 * fetched is what lets it say "do not index me".
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
