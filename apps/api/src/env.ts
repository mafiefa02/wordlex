import { type } from "arktype";

const Env = type({
  "PORT?": "string.integer.parse",
  // Browsers send credentials to this API, so the allowlist is explicit —
  // never a wildcard (ADR 0006).
  ALLOWED_ORIGINS: type("string")
    .pipe((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
    .to("string[] > 0"),
});

const parsed = Env(process.env);

if (parsed instanceof type.errors) {
  throw new Error(`Bad environment:\n${parsed.summary}`);
}

export const env = {
  port: parsed.PORT ?? 4000,
  allowedOrigins: parsed.ALLOWED_ORIGINS,
};
