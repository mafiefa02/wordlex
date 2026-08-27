ALTER TABLE "unknown_word_attempt" DROP CONSTRAINT "unknown_word_attempt_language_length_word_player_id_pk";--> statement-breakpoint
ALTER TABLE "game" ALTER COLUMN "player_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "unknown_word_attempt" ALTER COLUMN "player_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "unknown_word_attempt" ADD COLUMN "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "unknown_word_attempt" ADD COLUMN "game_id" uuid;--> statement-breakpoint
ALTER TABLE "unknown_word_attempt" ADD CONSTRAINT "unknown_word_attempt_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unknown_word_attempt_player_key" ON "unknown_word_attempt" USING btree ("language","length","word","player_id") WHERE "unknown_word_attempt"."player_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "unknown_word_attempt_game_key" ON "unknown_word_attempt" USING btree ("language","length","word","game_id") WHERE "unknown_word_attempt"."player_id" is null;--> statement-breakpoint
CREATE INDEX "unknown_word_attempt_game_idx" ON "unknown_word_attempt" USING btree ("game_id");--> statement-breakpoint
ALTER TABLE "unknown_word_attempt" ADD CONSTRAINT "unknown_word_attempt_has_an_identity" CHECK ("unknown_word_attempt"."player_id" is not null or "unknown_word_attempt"."game_id" is not null);