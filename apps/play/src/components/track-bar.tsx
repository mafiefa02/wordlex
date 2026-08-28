import { LANGUAGES, LENGTHS, type Language, type Length } from "@wordlex/domain";
import { Link } from "@tanstack/react-router";
import { cn } from "@wordlex/ui/lib/utils";

/*
  Short names, because this is a bar and not a menu — the full ones
  (`LANGUAGE_NAMES`) are what the result sheet and the landing page say.
*/
const SHORT: Record<Language, string> = {
  en: "English",
  id: "Indonesia",
  su: "Sunda",
  jv: "Jawa",
};

/** One class per language, so a pill differs from its neighbours by one token. */
export const HUE: Record<Language, string> = {
  en: "[--hue:var(--lang-en)]",
  id: "[--hue:var(--lang-id)]",
  su: "[--hue:var(--lang-su)]",
  jv: "[--hue:var(--lang-jv)]",
};

const PILL =
  "rounded-md px-2.5 py-[5px] text-sm font-medium text-muted-foreground no-underline transition-[background-color,color,box-shadow] duration-200 ease-out hover:bg-muted hover:text-foreground";

/*
  The chosen pill is tinted with its own language hue rather than a neutral, so
  the bar says which language you are in without a second label. The length
  pills inherit `--hue` from the bar, which the language sets — switching
  language re-tints them.
*/
const CHOSEN =
  "text-foreground [background:color-mix(in_oklch,var(--hue),var(--background)_84%)] [box-shadow:inset_0_0_0_1px_color-mix(in_oklch,var(--hue),transparent_62%)]";

/**
 * The Track, which lives in the URL (ADR 0001). Every pill is a real link, so a
 * Track is shareable and the back button works.
 */
export function TrackBar({ language, length }: { language: Language; length: Length }) {
  return (
    <nav
      aria-label="Track"
      className="flex flex-wrap items-center gap-1 border-b border-border px-4 py-2"
    >
      {LANGUAGES.map((code) => (
        <Link
          key={code}
          to="/"
          search={{ lang: code, length }}
          aria-current={code === language ? "true" : undefined}
          className={cn(PILL, HUE[code], code === language && CHOSEN)}
        >
          {SHORT[code]}
        </Link>
      ))}

      <span aria-hidden className="mx-1.5 h-4 w-px bg-border" />

      {LENGTHS.map((tiles) => (
        <Link
          key={tiles}
          to="/"
          search={{ lang: language, length: tiles }}
          aria-current={tiles === length ? "true" : undefined}
          className={cn(PILL, "tabular-nums", tiles === length && CHOSEN)}
        >
          {tiles}
        </Link>
      ))}
    </nav>
  );
}
