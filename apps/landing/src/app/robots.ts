import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

/**
 * The opposite of `apps/play/public/robots.txt`, and deliberately: this is the
 * surface search should find. The play app is a board that only exists once a
 * Player asks for it, so it asks to be left alone; this page is what describes
 * the game to someone who has not played it.
 *
 * Nothing is disallowed. Signing in lives in the play app now, so every page
 * this host serves is one we want read.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
