-- Hand-edited, the way `drizzle/0000_init.sql` is: drizzle-kit generates
-- `ADD COLUMN … NOT NULL` with no default, which cannot run against a table that
-- already holds rows. Games and Guesses that predate ADR 0024 were made without a
-- key, so there is nothing to backfill them with that means anything — a fresh
-- uuid each is exactly right, since no client will ever present one of them.
ALTER TABLE "game" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
UPDATE "game" SET "idempotency_key" = gen_random_uuid()::text WHERE "idempotency_key" IS NULL;--> statement-breakpoint
ALTER TABLE "game" ALTER COLUMN "idempotency_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "guess" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
UPDATE "guess" SET "idempotency_key" = gen_random_uuid()::text WHERE "idempotency_key" IS NULL;--> statement-breakpoint
ALTER TABLE "guess" ALTER COLUMN "idempotency_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "game" ADD CONSTRAINT "game_daily_idempotency_key" UNIQUE("daily_id","idempotency_key");--> statement-breakpoint
ALTER TABLE "guess" ADD CONSTRAINT "guess_game_idempotency_key" UNIQUE("game_id","idempotency_key");
