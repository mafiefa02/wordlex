// Loads data/words.csv into the `word` table (ADR 0018).
//
// The CSV carries no `status`, `source` or `reviewed_at`, so it cannot go
// straight into `word`. It lands in a staging table and moves across with an
// upsert that skips anything a human has touched: **the seed must never
// overwrite a reviewer**, or re-running the derivation quietly resurrects every
// word a speaker rejected.
//
// Nothing is ever deleted here. A row that has left the CSV keeps its place,
// because `daily.word` has no foreign key and deleting one could strip the
// Answer out from under a Daily that has already been issued — it just stops
// being answerable, so it can still be typed but can never be a Daily again.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

// Reads process.env rather than ../src/env, which validates the whole server's
// environment: seeding should not need CORS to be configured.
const url = process.env.DIRECT_URL;

if (!url) {
  throw new Error(
    "DIRECT_URL is not set. Seeding needs the direct 5432 connection, not the pooler.",
  );
}

const CSV = fileURLToPath(new URL("../../../data/words.csv", import.meta.url));
const HEADER = "language,length,word,display,in_answer_pool";
const CHUNK = 2_000;

const [header, ...lines] = (await readFile(CSV, "utf8")).trim().split("\n");

if (header !== HEADER) {
  throw new Error(`Unexpected CSV header:\n  got      ${header}\n  expected ${HEADER}`);
}

const rows = lines.map((line, i) => {
  const fields = line.split(",");
  if (fields.length !== 5) {
    throw new Error(`Line ${i + 2} has ${fields.length} fields, not 5: ${line}`);
  }
  const [language, length, word, display, inAnswerPool] = fields as [
    string,
    string,
    string,
    string,
    string,
  ];
  return {
    language,
    length: Number(length),
    word,
    display,
    in_answer_pool: inAnswerPool === "true",
  };
});

const sql = postgres(url);

try {
  const [before] = await sql<{ n: string }[]>`select count(*) as n from word`;
  const { affected, retired } = await sql.begin(async (tx) => {
    await tx`
      create temp table word_seed (
        language text not null,
        length smallint not null,
        word text not null,
        display text not null,
        in_answer_pool boolean not null
      ) on commit drop
    `;
    // Tells the `word_reviewed` trigger that this is the seed and not a person,
    // so it does not stamp every row it touches as reviewed.
    await tx`set local wordlex.seeding = 'on'`;
    for (let i = 0; i < rows.length; i += CHUNK) {
      // Sequential on purpose: every chunk shares one connection inside one
      // transaction, so there is nothing here to run in parallel.
      // oxlint-disable-next-line no-await-in-loop
      await tx`insert into word_seed ${tx(rows.slice(i, i + CHUNK))}`;
    }
    const result = await tx`
      insert into word (language, length, word, display, in_answer_pool)
      select language, length, word, display, in_answer_pool from word_seed
      on conflict (language, length, word) do update
        set display = excluded.display,
            in_answer_pool = excluded.in_answer_pool
        -- 'active' is redundant while the trigger is doing its job, and it is
        -- what stops one rejected row from failing the CHECK and taking all
        -- 124k rows down with it if it ever is not.
        where word.source = 'derived'
          and word.reviewed_at is null
          and word.status = 'active'
    `;
    // A word the derivation no longer produces vanishes from the CSV, so the
    // upsert never revisits it and it would stay answerable forever.
    const demoted = await tx`
      update word set in_answer_pool = false
      where source = 'derived' and reviewed_at is null and in_answer_pool
        and not exists (
          select 1 from word_seed s
          where s.language = word.language and s.length = word.length and s.word = word.word
        )
    `;
    return { affected: result.count, retired: demoted.count };
  });
  const [after] = await sql<{ n: string }[]>`select count(*) as n from word`;

  const added = Number(after?.n) - Number(before?.n);
  console.log(
    `${rows.length} rows in the CSV\n` +
      `  ${added} added, ${affected - added} updated, ` +
      `${rows.length - affected} left alone because a reviewer had touched them\n` +
      `  ${retired} no longer in the CSV, so no longer answerable\n` +
      `  ${after?.n} rows in word`,
  );
} finally {
  await sql.end();
}
