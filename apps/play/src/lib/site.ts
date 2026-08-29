/**
 * The landing page's origin. It is a separate deployment (ADR 0006), so the
 * lockup in the header and the terms links in the sign-in dialog are plain
 * hrefs out of this app rather than routes.
 *
 * A wrong value here is a bad link rather than a broken game, which is why it
 * falls back instead of failing the build the way `VITE_API_URL` does.
 */
export const siteUrl = import.meta.env.VITE_SITE_URL ?? "http://localhost:3000";
