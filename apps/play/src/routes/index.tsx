import { LANGUAGES, LANGUAGE_NAMES, LENGTHS, guessBudget, wordlexDay } from "@wordlex/domain";
import { Link, createFileRoute } from "@tanstack/react-router";
import { type } from "arktype";
import { Logo } from "@wordlex/ui/components/logo";

// The Track lives in the URL, which is the reason this app is TanStack Start
// (ADR 0001). CONTEXT.md avoids "mode", so the length param is spelled out.
const Lang = type.enumerated(...LANGUAGES);
const Len = type.enumerated(...LENGTHS);

export const Route = createFileRoute("/")({
  // Each half falls back on its own, so a junk length keeps the language the
  // player asked for. A hand-edited or stale link is normal, not a crash.
  validateSearch: (search: Record<string, unknown>) => {
    const lang = Lang(search.lang);
    const length = Len(search.length);
    return {
      lang: lang instanceof type.errors ? "en" : lang,
      length: length instanceof type.errors ? 5 : length,
    };
  },
  component: Home,
});

function Home() {
  const { lang, length } = Route.useSearch();

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1>
        <Logo size={32} />
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{wordlexDay()}</p>

      <nav className="mt-6 flex flex-wrap gap-3 text-sm">
        {LANGUAGES.map((language) => (
          <Link
            key={language}
            to="/"
            search={{ lang: language, length }}
            className="underline"
            activeProps={{ className: "font-semibold" }}
          >
            {LANGUAGE_NAMES[language]}
          </Link>
        ))}
      </nav>

      <nav className="mt-2 flex gap-3 text-sm">
        {LENGTHS.map((wordLength) => (
          <Link
            key={wordLength}
            to="/"
            search={{ lang, length: wordLength }}
            className="underline"
            activeProps={{ className: "font-semibold" }}
          >
            {wordLength} letters
          </Link>
        ))}
      </nav>

      <p className="mt-6 text-sm">
        {LANGUAGE_NAMES[lang]} {length} — {guessBudget(length)} guesses. The board goes here.
      </p>
    </main>
  );
}
