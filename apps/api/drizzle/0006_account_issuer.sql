-- better-auth 1.7 keys a linked credential on `(issuer, account_id)`. Adding the
-- column NOT NULL with no default would fail on a table that already had rows —
-- it cannot here, because until this migration's own commit there was no way to
-- sign in at all: `socialProviders` was empty and email sign-in was never
-- enabled, so better-auth could not have written an `account` row anywhere.
--
-- There is deliberately no backfill value. An issuer identifies *which* provider
-- vouched for a credential, so inventing one for a row of unknown origin would
-- be worse than the migration failing loudly.
ALTER TABLE "account" ADD COLUMN "issuer" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "account_issuer_accountId_uidx" ON "account" USING btree ("issuer","account_id");
