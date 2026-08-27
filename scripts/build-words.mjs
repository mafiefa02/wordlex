#!/usr/bin/env node
// Builds the one committed CSV that seeds the `word` table (ADR 0018).
//
// Derives a Dictionary and an Answer Pool per Track (ADR 0004) and applies the
// four mechanical filters ADR 0013 says actually ship. Self-contained: fetches
// its own sources and caches them under data/.cache/.
//
// Requires macOS for /usr/share/dict/web2, the cased dictionary the English
// proper-noun filter needs — see ADR 0013. Refuses to run without it, because
// silently shipping English pools full of `aaron` and `alaska` is worse than
// not shipping.
//
// Running this is a deliberate act, perhaps twice a year. The diff is the point —
// so the run says which sources came off disk and how old they are. A cache that
// silently answers for the network turns "upstream has not changed" and "I did
// not ask upstream" into the same empty diff. Pass --refresh to refetch.

import { existsSync } from "node:fs";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Resolved against this file, so the script behaves the same run from anywhere.
const REPO = new URL("../", import.meta.url);
const CACHE = fileURLToPath(new URL("data/.cache", REPO));
const OUT = fileURLToPath(new URL("data/words.csv", REPO));

const SOURCES = {
  "sunda.json":
    "https://raw.githubusercontent.com/Muhammad-Ikhwan-Fathulloh/Saka-NLP/refs/heads/main/saka/dict/sunda_dict.json",
  "jawa.json":
    "https://raw.githubusercontent.com/Muhammad-Ikhwan-Fathulloh/Saka-NLP/refs/heads/main/saka/dict/jawa_dict.json",
  "id.txt":
    "https://raw.githubusercontent.com/Wikidepia/indonesian_datasets/master/dictionary/wordlist/data/wordlist.txt",
  "en_dict.txt": "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt",
  "en_block.txt":
    "https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/en",
  ...Object.fromEntries(
    ["en", "id", "de", "es", "fr", "tr", "pt"].map((l) => [
      `${l}_freq.txt`,
      `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/${l}/${l}_50k.txt`,
    ]),
  ),
};

const LENGTHS = [5, 6, 7];
// A word in this many unrelated European languages is probably a name or an
// international borrowing. Tuned by eye: ID needs the higher bar because
// Indonesian genuinely contains a lot of loanwords.
const ID_THRESHOLD = 4;
const SU_JV_THRESHOLD = 3;
const FREQ_CUT = 10_000; // ADR 0004's Answer Pool cut for EN and ID
const WEB2 = "/usr/share/dict/web2";

/** Strips accents and lowercases, matching how the Dictionary lookup normalises. */
const fold = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
const isWord = (s) => /^[a-z]+$/.test(s);

const REFRESH = process.argv.includes("--refresh");
const fromCache = [];

async function fetchCached(name, url) {
  const path = `${CACHE}/${name}`;
  if (!REFRESH && existsSync(path)) {
    fromCache.push((await stat(path)).mtime);
    return readFile(path, "utf8");
  }
  process.stderr.write(`fetching ${name}\n`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  const body = await res.text();
  // Write-then-rename: an interrupted run must not leave a truncated file that
  // the next run trusts. requireNonEmpty cannot catch that — truncated is not empty.
  await writeFile(`${path}.tmp`, body);
  await rename(`${path}.tmp`, path);
  return body;
}

const toLines = (text) =>
  text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
const wordSet = (text) => new Set(toLines(text).map(fold).filter(isWord));

/**
 * Folded word to the spelling a Player is shown after the Game (ADR 0004).
 * Sorted before folding so that when two accented headwords collapse onto one
 * key, the same one wins every run and the CSV does not churn.
 */
function displayMap(entries) {
  const byWord = new Map();
  for (const original of entries.toSorted()) {
    const folded = fold(original);
    if (isWord(folded) && !byWord.has(folded)) byWord.set(folded, original);
  }
  return byWord;
}

/**
 * Frequency files are "word count" per line; we only care about the ordering.
 * The rank counts accepted words, not lines — these files carry a few hundred
 * numerals and symbols in the first 10k, and counting lines would quietly
 * shrink FREQ_CUT below its stated size.
 */
const freqRank = (text) => {
  const ranks = new Map();
  let ordinal = 0;
  for (const line of toLines(text)) {
    const word = fold(line.split(" ")[0]);
    if (isWord(word) && !ranks.has(word)) ranks.set(word, ordinal++);
  }
  return ranks;
};

/** A silently-empty source yields plausible-looking empty output, so refuse it. */
function requireNonEmpty(label, collection) {
  const size = collection.size ?? collection.length;
  if (!size) throw new Error(`${label} parsed to nothing — a source has changed shape`);
  return collection;
}

if (!existsSync(WEB2)) {
  throw new Error(
    `No cased dictionary at ${WEB2} (macOS only). ADR 0013 makes it a build\n` +
      `dependency: without it the English Answer Pools keep their proper nouns.`,
  );
}

await mkdir(CACHE, { recursive: true });

const src = Object.fromEntries(
  await Promise.all(Object.entries(SOURCES).map(async ([n, u]) => [n, await fetchCached(n, u)])),
);

if (fromCache.length) {
  const oldest = new Date(Math.min(...fromCache)).toISOString().slice(0, 10);
  console.log(
    `${fromCache.length}/${Object.keys(SOURCES).length} sources came from data/.cache, ` +
      `oldest fetched ${oldest}. Pass --refresh to refetch.\n`,
  );
}

const indonesian = requireNonEmpty("Indonesian wordlist", wordSet(src["id.txt"]));
const idRank = requireNonEmpty("id frequency list", freqRank(src["id_freq.txt"]));
const enRank = requireNonEmpty("en frequency list", freqRank(src["en_freq.txt"]));
const blocklist = requireNonEmpty("English blocklist", wordSet(src["en_block.txt"]));

// Only-ever-capitalised in a cased dictionary means proper noun (ADR 0013).
const web2Any = new Set();
const web2Lower = new Set();
for (const entry of toLines(await readFile(WEB2, "utf8"))) {
  web2Any.add(entry.toLowerCase());
  if (entry[0] === entry[0].toLowerCase()) web2Lower.add(entry.toLowerCase());
}
const isProperNoun = (w) => web2Any.has(w) && !web2Lower.has(w);

const crossLingual = ["en", "de", "es", "fr", "tr", "pt"].map((l) =>
  requireNonEmpty(`${l} frequency list`, new Set(freqRank(src[`${l}_freq.txt`]).keys())),
);
const crossCount = (w) => crossLingual.reduce((n, set) => n + (set.has(w) ? 1 : 0), 0);

/** The Dictionary for each language: everything typeable, pollution included. */
const dictionaries = {
  en: displayMap(toLines(src["en_dict.txt"])),
  id: displayMap(toLines(src["id.txt"])),
  su: displayMap(Object.keys(JSON.parse(src["sunda.json"]))),
  jv: displayMap(Object.keys(JSON.parse(src["jawa.json"]))),
};
for (const [language, dictionary] of Object.entries(dictionaries)) {
  requireNonEmpty(`${language} dictionary`, dictionary);
}

/**
 * ADR 0004's Answer Pool, plus ADR 0013's mechanical filters. EN and ID narrow
 * a too-large dictionary by frequency; SU and JV subtract Indonesian from a
 * small, polluted one. The cross-lingual test runs as a filter rather than a
 * review list because nobody is going to read the list — ADR 0013 says why.
 */
function answerPool(language, length) {
  const words = [...dictionaries[language].keys()].filter((w) => w.length === length);
  switch (language) {
    case "en": {
      const pool = words.filter((w) => enRank.get(w) < FREQ_CUT);
      return {
        pool,
        kept: pool.filter((w) => !isProperNoun(w) && !blocklist.has(w)),
      };
    }
    case "id": {
      const pool = words.filter((w) => idRank.get(w) < FREQ_CUT);
      return { pool, kept: pool.filter((w) => crossCount(w) < ID_THRESHOLD) };
    }
    default: {
      const pool = words.filter((w) => !indonesian.has(w));
      return { pool, kept: pool.filter((w) => crossCount(w) < SU_JV_THRESHOLD) };
    }
  }
}

const NAMES = { en: "English", id: "Indonesian", su: "Sundanese", jv: "Javanese" };
const rows = [];
const table = [];

for (const language of ["en", "id", "su", "jv"]) {
  const dictionary = dictionaries[language];
  const line = { language, dictionary: 0, before: [], after: [] };
  for (const length of LENGTHS) {
    const { pool, kept } = answerPool(language, length);
    const answerable = new Set(kept);
    line.before.push(pool.length);
    line.after.push(kept.length);
    for (const word of [...dictionary.keys()].filter((w) => w.length === length).toSorted()) {
      line.dictionary++;
      rows.push([language, length, word, dictionary.get(word), answerable.has(word)]);
    }
  }
  table.push(line);
}

console.log("Answer Pools, before and after ADR 0013's mechanical filters:\n");
console.log("            Dictionary        5             6             7");
for (const { language, dictionary, before, after } of table) {
  const cells = LENGTHS.map(
    (_, i) => `${String(before[i]).padStart(5)}→${String(after[i]).padStart(5)}`,
  );
  console.log(
    `  ${NAMES[language].padEnd(11)}${String(dictionary).padStart(7)}   ${cells.join("  ")}`,
  );
}
const dropped = table.reduce((n, t) => n + t.before.reduce((a, b, i) => a + b - t.after[i], 0), 0);
console.log(`\n  ${dropped} words dropped by the filters in total.`);

// Every display is one token of letters and diacritics, so nothing in this CSV
// ever needs quoting — and the seed can therefore split on commas. Fail here if
// a source ever changes that, rather than writing a file the seed misreads.
const unquotable = rows.find(([, , , display]) => /[",\n]/.test(display));
if (unquotable) {
  throw new Error(`display needs quoting: ${JSON.stringify(unquotable)}`);
}

// Deterministic order, so re-running this shows only what actually changed.
const sorted = rows.toSorted(
  (a, b) => a[0].localeCompare(b[0]) || a[1] - b[1] || a[2].localeCompare(b[2]),
);
const csv =
  "language,length,word,display,in_answer_pool\n" +
  sorted.map((row) => row.join(",")).join("\n") +
  "\n";
await writeFile(OUT, csv);
console.log(`\nWrote ${OUT}\n  ${rows.length} rows, ${(csv.length / 1e6).toFixed(1)} MB`);
