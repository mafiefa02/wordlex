/**
 * The theme is a `data-theme` attribute on `<html>`, which the token file
 * already honours in both directions. Dark is the default, so both apps render
 * `data-theme="dark"` and this script only has to correct it for someone who
 * has chosen otherwise.
 *
 * The choice lives in a cookie rather than `localStorage` because the landing
 * page and the play app are separate origins (ADR 0006), and `localStorage`
 * does not cross one — a player who picked light on the landing page would have
 * got dark in the game. A cookie scoped to the domain they share does cross,
 * the same way the session cookie already does.
 *
 * The script has to run before first paint, which is why it is a string rather
 * than a component: it goes inline in the document head, in both apps.
 */
export const THEME_COOKIE = "wordlex-theme";

export type Theme = "light" | "dark";

export const themeInitScript = `try{var m=document.cookie.match(/(?:^|;\\s*)${THEME_COOKIE}=(light|dark)(?:;|$)/);if(m)document.documentElement.dataset.theme=m[1]}catch(e){}`;

/**
 * Remembers the choice for a year. Deliberately not `HttpOnly` — the toggle and
 * the head script both read it from JavaScript — and there is nothing secret in
 * a colour preference.
 *
 * `domain` is left unset locally, where every app is on `localhost` and a
 * domain-scoped cookie is neither needed nor accepted. In production it is the
 * domain the apps sit under, which is what carries the choice between them.
 */
export function writeTheme(theme: Theme, domain?: string) {
  const cookie = [`${THEME_COOKIE}=${theme}`, "path=/", "max-age=31536000", "samesite=lax"];
  if (domain) cookie.push(`domain=${domain}`);
  if (window.location.protocol === "https:") cookie.push("secure");
  document.cookie = cookie.join("; ");
}
