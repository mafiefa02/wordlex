export const LANGUAGES = ["en", "id", "su", "jv"] as const;
export type Language = (typeof LANGUAGES)[number];

export const LENGTHS = [5, 6, 7] as const;
export type Length = (typeof LENGTHS)[number];

/** A language paired with a word length. Twelve exist. */
export type Track = {
  language: Language;
  length: Length;
};

export const TRACKS: readonly Track[] = LANGUAGES.flatMap((language) =>
  LENGTHS.map((length) => ({ language, length })),
);

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: "English",
  id: "Bahasa Indonesia",
  su: "Basa Sunda",
  jv: "Basa Jawa",
};

/** How many Guesses a Game grants. One more than the word is long. */
export function guessBudget(length: Length): number {
  return length + 1;
}
