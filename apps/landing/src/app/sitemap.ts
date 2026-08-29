import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

/*
  Kept in step with `UPDATED` in the two pages below. A real edit date is worth
  more than `new Date()`, which would claim all three pages changed on every
  deploy and teach a crawler to ignore the field.
*/
const PRIVACY_UPDATED = "2026-08-28";
const TERMS_UPDATED = "2026-08-28";

/**
 * Every page on this host worth indexing, which is now all of them.
 *
 * The play app is not here. It is a separate host (ADR 0006), a sitemap
 * may only speak for the host that serves it, and that app asks crawlers to
 * stay away.
 *
 * No `changeFrequency` or `priority`: Google ignores both, and a field nobody
 * reads is a field that can quietly go stale.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl },
    { url: `${siteUrl}/privacy`, lastModified: PRIVACY_UPDATED },
    { url: `${siteUrl}/tos`, lastModified: TERMS_UPDATED },
  ];
}
