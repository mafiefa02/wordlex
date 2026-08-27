#!/usr/bin/env node
// Generates the proper-noun review lists described in ADR 0013.
// Self-contained: fetches its own sources, caches them under data/.cache/.
// Requires macOS for /usr/share/dict/web2 (a cased dictionary) — see ADR 0013.

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Resolved against this file, so the script behaves the same run from anywhere.
const REPO = new URL("../", import.meta.url);
const CACHE = fileURLToPath(new URL("data/.cache", REPO));
const OUT = fileURLToPath(new URL("data/review", REPO));

const SOURCES = {
  "sunda.json": "https://raw.githubusercontent.com/Muhammad-Ikhwan-Fathulloh/Saka-NLP/refs/heads/main/saka/dict/sunda_dict.json",
  "jawa.json": "https://raw.githubusercontent.com/Muhammad-Ikhwan-Fathulloh/Saka-NLP/refs/heads/main/saka/dict/jawa_dict.json",
  "id.txt": "https://raw.githubusercontent.com/Wikidepia/indonesian_datasets/master/dictionary/wordlist/data/wordlist.txt",
  "en_dict.txt": "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt",
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

/** Strips accents and lowercases, matching how the Dictionary lookup normalises. */
const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const isWord = (s) => /^[a-z]+$/.test(s);

async function fetchCached(name, url) {
  const path = `${CACHE}/${name}`;
  if (existsSync(path)) return readFile(path, "utf8");
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

const toLines = (text) => text.split("\n").map((s) => s.trim()).filter(Boolean);
const wordSet = (text) => new Set(toLines(text).map(fold).filter(isWord));
/**
 * Frequency files are "word count" per line; we only care about the ordering.
 * The rank counts accepted words, not lines — these files carry a few hundred
 * numerals and symbols in the first 10k, and counting lines would both mislabel
 * the rank shown to reviewers and quietly shrink FREQ_CUT below its stated size.
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

await mkdir(CACHE, { recursive: true });
await mkdir(OUT, { recursive: true });

const src = Object.fromEntries(
  await Promise.all(
    Object.entries(SOURCES).map(async ([n, u]) => [n, await fetchCached(n, u)]),
  ),
);

const indonesian = requireNonEmpty("Indonesian wordlist", wordSet(src["id.txt"]));
const idRank = requireNonEmpty("id frequency list", freqRank(src["id_freq.txt"]));
const enRank = requireNonEmpty("en frequency list", freqRank(src["en_freq.txt"]));

/** ADR 0004's Answer Pool for a frequency-cut language. One definition, three callers. */
const freqPool = (dictionary, ranks, len) =>
  [...dictionary].filter((w) => w.length === len && ranks.has(w) && ranks.get(w) < FREQ_CUT);

// Frequency files are "word count" per line — take the first token, not the line.
const crossLingual = ["en", "de", "es", "fr", "tr", "pt"].map((l) =>
  requireNonEmpty(`${l} frequency list`, new Set(freqRank(src[`${l}_freq.txt`]).keys())),
);
const crossCount = (w) => crossLingual.reduce((n, set) => n + (set.has(w) ? 1 : 0), 0);

// --- English: report only. The Webster filter is mechanical and needs no review.
const WEB2 = "/usr/share/dict/web2";
if (existsSync(WEB2)) {
  const lowercased = new Set();
  const anyCase = new Set();
  for (const entry of toLines(await readFile(WEB2, "utf8"))) {
    anyCase.add(entry.toLowerCase());
    if (entry[0] === entry[0].toLowerCase()) lowercased.add(entry.toLowerCase());
  }
  // Only-ever-capitalised in a cased dictionary means proper noun.
  const isProperNoun = (w) => anyCase.has(w) && !lowercased.has(w);
  const enDict = requireNonEmpty("English wordlist", wordSet(src["en_dict.txt"]));

  console.log("English — mechanical proper-noun filter (no review needed):");
  for (const len of LENGTHS) {
    const pool = freqPool(enDict, enRank, len);
    const dropped = pool.filter(isProperNoun);
    console.log(`  ${len}: ${pool.length} → ${pool.length - dropped.length}  (dropped ${dropped.length})`);
  }
} else {
  console.log(`English — skipped, no cased dictionary at ${WEB2} (macOS only).`);
}

const HEADER = (title, note) =>
  `# ${title}\n#\n${note.split("\n").map((l) => `# ${l}`).join("\n")}\n#\n` +
  `# HOW TO REVIEW: delete any line that is fine as a puzzle answer.\n` +
  `# Whatever is left gets removed from the Answer Pool.\n#\n` +
  `# "Fine as a puzzle answer" is NOT the same as "a real word". Keep\n` +
  `# (do not delete) anything you would rather people did not meet as a\n` +
  `# Daily — names, and religiously or otherwise sensitive words — even\n` +
  `# when the word is perfectly real. "allah" is the example to remember.\n\n`;

// --- Indonesian: a review list, never an automatic filter. The same test that
// finds `bangkok` also finds `agenda`, and only a speaker can tell them apart.
{
  const sections = LENGTHS.map((len) => {
    const pool = freqPool(indonesian, idRank, len);
    const flagged = pool
      .filter((w) => crossCount(w) >= ID_THRESHOLD)
      .sort((a, b) => crossCount(b) - crossCount(a) || a.localeCompare(b));
    return `## ${len} letters (${flagged.length})\n` +
      flagged.map((w) => `${w}\t\t(in ${crossCount(w)}/6 other languages)`).join("\n");
  });
  const total = sections.reduce((n, s) => n + Number(s.match(/\((\d+)\)/)[1]), 0);
  await writeFile(
    `${OUT}/indonesian-proper-nouns.txt`,
    HEADER(
      `Indonesian Answer Pool — possible proper nouns (${total} words)`,
      `Flagged because the word appears in at least ${ID_THRESHOLD} of 6 unrelated\nEuropean languages, which catches names — but also catches genuine\nIndonesian loanwords like "agenda" and "editor". Expect most of this\nlist to be fine. It is a skim, not a purge.\n\nSUPERSEDED by indonesian-answer-pool.txt, which covers every word in\nthe pool. Use this one only if five minutes is all there is.`,
    ) + sections.join("\n\n") + "\n",
  );
  console.log(`\nWrote ${OUT}/indonesian-proper-nouns.txt (${total} words)`);
}

// --- Indonesian, whole pool. Reviewing all of it in one sitting is feasible for
// a native speaker and subsumes the proper-noun list, the blocklist and ADR
// 0012's Indonesian quality pass. Sorted rarest-first so the suspect words are
// at the top and a partial review still catches the worst of it.
{
  let total = 0;
  const sections = LENGTHS.map((len) => {
    const pool = freqPool(indonesian, idRank, len).sort((a, b) => idRank.get(b) - idRank.get(a));
    total += pool.length;
    const rows = pool.map((w) => {
      const flag = crossCount(w) >= ID_THRESHOLD ? "  <- also flagged as a possible name" : "";
      return `${w}\t#${idRank.get(w) + 1}${flag}`;
    });
    return `## ${len} letters (${pool.length})\n${rows.join("\n")}`;
  });
  await writeFile(
    `${OUT}/indonesian-answer-pool.txt`,
    HEADER(
      `Indonesian Answer Pool — every word (${total})`,
      `Reviewing this whole file closes three things at once: the blocklist\n(no source exists for Indonesian), the proper-noun list, and ADR 0012's\ndeferred quality pass. It supersedes indonesian-proper-nouns.txt, which\nremains as the five-minute version if that is all the time there is.\n\nSorted rarest word first, so the obscure tail — where the bad answers\nlive — is at the top. The common words near the bottom of each section\nwill mostly be fine. #N is the word's rank in the frequency list.`,
    ) + sections.join("\n\n") + "\n",
  );
  console.log(`Wrote ${OUT}/indonesian-answer-pool.txt (${total} words)`);
}

// --- Sundanese and Javanese: almost empty, because ADR 0004's Indonesian
// subtraction already removed the names. Glosses included so the real words
// are obvious at a glance.
{
  let total = 0;
  const blocks = [];
  for (const [label, file] of [["Sundanese", "sunda.json"], ["Javanese", "jawa.json"]]) {
    const raw = JSON.parse(src[file]);
    // The Javanese source is OCR'd and carries page markers like "--- 179 ---".
    const tidy = (g) =>
      g.replace(/---\s*\d+\s*---/g, "").replace(/\s+/g, " ").trim().slice(0, 60);
    const glosses = new Map(
      Object.entries(raw).map(([k, v]) => [fold(k), tidy(v.arti ?? "")]),
    );
    const dictionary = requireNonEmpty(`${label} dictionary`, new Set([...glosses.keys()].filter(isWord)));
    for (const len of LENGTHS) {
      // Answer Pool per ADR 0004: the Dictionary minus everything Indonesian.
      const pool = [...dictionary].filter((w) => w.length === len && !indonesian.has(w));
      const flagged = pool.filter((w) => crossCount(w) >= SU_JV_THRESHOLD).sort();
      total += flagged.length;
      blocks.push(
        `## ${label} ${len} letters (${flagged.length})` +
          (flagged.length
            ? "\n" + flagged.map((w) => `${w}\t\t${glosses.get(w) || "(no gloss)"}`).join("\n")
            : "\n# (none)"),
      );
    }
  }
  await writeFile(
    `${OUT}/sundanese-javanese-proper-nouns.txt`,
    HEADER(
      `Sundanese and Javanese Answer Pools — possible proper nouns (${total} words)`,
      `Short because ADR 0004's Indonesian subtraction already removed most\nnames. The Indonesian gloss after each word tells you whether it is a\nreal word — but read the rule above before deleting on that basis\nalone. "rabbi" has a gloss and is still not a puzzle answer.\n\nThis list does NOT cover profanity — there is no blocklist source for\neither language. See ADR 0013.`,
    ) + blocks.join("\n\n") + "\n",
  );
  console.log(`Wrote ${OUT}/sundanese-javanese-proper-nouns.txt (${total} words)`);
}
