CREATE TYPE "public"."game_status" AS ENUM('playing', 'won', 'lost', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."word_source" AS ENUM('derived', 'reviewer');--> statement-breakpoint
CREATE TYPE "public"."word_status" AS ENUM('active', 'rejected');--> statement-breakpoint
CREATE TABLE "badge_award" (
	"player_id" uuid NOT NULL,
	"badge" text NOT NULL,
	"seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "badge_award_player_id_badge_pk" PRIMARY KEY("player_id","badge")
);
--> statement-breakpoint
CREATE TABLE "daily" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"language" text NOT NULL,
	"length" smallint NOT NULL,
	"day" date NOT NULL,
	"word" text NOT NULL,
	"rotation" smallint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_track_day_key" UNIQUE("language","length","day"),
	CONSTRAINT "daily_word_length_matches_track" CHECK (length("daily"."word") = "daily"."length")
);
--> statement-breakpoint
CREATE TABLE "game" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"daily_id" uuid NOT NULL,
	"status" "game_status" DEFAULT 'playing' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_player_daily_key" UNIQUE("player_id","daily_id")
);
--> statement-breakpoint
CREATE TABLE "guess" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"word" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guess_game_position_key" UNIQUE("game_id","position")
);
--> statement-breakpoint
CREATE TABLE "player" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_account_id_unique" UNIQUE("account_id")
);
--> statement-breakpoint
CREATE TABLE "unknown_word_attempt" (
	"language" text NOT NULL,
	"length" smallint NOT NULL,
	"word" text NOT NULL,
	"player_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unknown_word_attempt_language_length_word_player_id_pk" PRIMARY KEY("language","length","word","player_id")
);
--> statement-breakpoint
CREATE TABLE "word" (
	"language" text NOT NULL,
	"length" smallint NOT NULL,
	"word" text NOT NULL,
	"display" text NOT NULL,
	"in_answer_pool" boolean DEFAULT false NOT NULL,
	"status" "word_status" DEFAULT 'active' NOT NULL,
	"source" "word_source" DEFAULT 'derived' NOT NULL,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "word_language_length_word_pk" PRIMARY KEY("language","length","word"),
	CONSTRAINT "word_rejected_is_not_answerable" CHECK (not ("word"."status" = 'rejected' and "word"."in_answer_pool")),
	CONSTRAINT "word_length_matches_track" CHECK (length("word"."word") = "word"."length")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "badge_award" ADD CONSTRAINT "badge_award_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game" ADD CONSTRAINT "game_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game" ADD CONSTRAINT "game_daily_id_daily_id_fk" FOREIGN KEY ("daily_id") REFERENCES "public"."daily"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guess" ADD CONSTRAINT "guess_game_id_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."game"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player" ADD CONSTRAINT "player_account_id_user_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unknown_word_attempt" ADD CONSTRAINT "unknown_word_attempt_player_id_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_track_word_idx" ON "daily" USING btree ("language","length","word");--> statement-breakpoint
CREATE INDEX "game_daily_idx" ON "game" USING btree ("daily_id");--> statement-breakpoint
CREATE INDEX "unknown_word_attempt_player_idx" ON "unknown_word_attempt" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "word_answer_pool_idx" ON "word" USING btree ("language","length") WHERE "word"."in_answer_pool" and "word"."status" = 'active';--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");-- The WordleX Day, in SQL. ADR 0015 says this maths lives in exactly one place;
-- ADR 0019 makes this the one deliberate second copy, because the trigger, the
-- picker and the rollover job below all need it and none of them can call
-- TypeScript. Keep it in step with packages/domain/src/day.ts.
--
-- STABLE, never IMMUTABLE: Postgres may fold an immutable call into a cached
-- plan, which would freeze the day boundary at whenever that plan was built.
CREATE FUNCTION wordlex_day() RETURNS date
	LANGUAGE sql
	STABLE
	AS $$
		SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date;
	$$;
--> statement-breakpoint
COMMENT ON FUNCTION wordlex_day() IS 'The WordleX Day: 00:00 WIB rollover. Mirrors packages/domain/src/day.ts (ADR 0019).';
--> statement-breakpoint
-- Issues the Daily for one Track and one WordleX Day, if it has none yet. Both
-- the rollover job and the read path call this, so there is a single definition
-- of how an Answer is chosen (ADR 0019). Returns the new row, or nothing when
-- the Daily already existed — either way the caller reads afterwards.
--
-- A word is the Answer at most once per Rotation. When a Rotation has used up
-- the whole Answer Pool the next one starts, rather than leaving the Track with
-- no Daily at all; `daily.rotation` is then what answers how often a word has
-- come up and on which passes.
CREATE FUNCTION wordlex_issue_daily(p_language text, p_length int, p_day date)
	RETURNS SETOF daily
	LANGUAGE plpgsql
	AS $$
	DECLARE
		current_rotation int;
		neighbours text[];
		chosen text;
	BEGIN
		-- The common case: ADR 0019's read path calls this before every read.
		IF EXISTS (
			SELECT 1 FROM daily d
			WHERE d.language = p_language AND d.length = p_length AND d.day = p_day
		) THEN
			RETURN;
		END IF;

		-- Nothing answerable at all is a broken seed rather than a used-up
		-- Rotation, and it is the only case where a Track gets no Daily.
		IF NOT EXISTS (
			SELECT 1 FROM word w
			WHERE w.language = p_language AND w.length = p_length
				AND w.in_answer_pool AND w.status = 'active'
		) THEN
			RETURN;
		END IF;

		-- The Answers on the days either side. A new Rotation makes the whole
		-- pool eligible again, including yesterday's word, and a refilled hole
		-- has a neighbour on both sides.
		neighbours := ARRAY(
			SELECT d.word FROM daily d
			WHERE d.language = p_language AND d.length = p_length
				AND d.day IN (p_day - 1, p_day + 1)
		);

		-- Which Rotation this day belongs to: the one its nearest earlier
		-- neighbour is on. Taking the Track's highest instead would put a refilled
		-- hole on the next Rotation while the days either side of it are still on
		-- the previous one.
		current_rotation := coalesce(
			(
				SELECT d.rotation FROM daily d
				WHERE d.language = p_language AND d.length = p_length AND d.day <= p_day
				ORDER BY d.day DESC
				LIMIT 1
			),
			1
		);

		-- Walk forward until a Rotation still has a word free. Almost always the
		-- first one does; it climbs only for a day wedged between two Rotations
		-- that have both used the whole pool. The pool is known to be non-empty,
		-- so some Rotation is free and this ends.
		LOOP
			chosen := NULL;
			SELECT w.word INTO chosen
			FROM word w
			WHERE w.language = p_language
				AND w.length = p_length
				AND w.in_answer_pool
				AND w.status = 'active'
				AND NOT EXISTS (
					SELECT 1 FROM daily d
					WHERE d.language = p_language AND d.length = p_length
						AND d.rotation = current_rotation AND d.word = w.word
				)
			ORDER BY (w.word = ANY(neighbours)), random()
			LIMIT 1;

			EXIT WHEN chosen IS NOT NULL;
			current_rotation := current_rotation + 1;
		END LOOP;

		RETURN QUERY
		INSERT INTO daily (language, length, day, word, rotation)
		VALUES (p_language, p_length, p_day, chosen, current_rotation)
		ON CONFLICT (language, length, day) DO NOTHING
		RETURNING *;
	END;
	$$;
--> statement-breakpoint
-- Once a WordleX Day has started its Daily can never change (ADR 0019). This is
-- a trigger and not a convention because the people most likely to break it are
-- us with psql open. Future days stay freely editable, which is where ADR 0012's
-- word removal acts: delete the row and the next rollover refills the hole.
CREATE FUNCTION wordlex_daily_is_frozen() RETURNS trigger
	LANGUAGE plpgsql
	AS $$
	BEGIN
		IF OLD.day <= wordlex_day() THEN
			RAISE EXCEPTION 'daily % for %-% is live; % is not allowed (ADR 0019)',
				OLD.day, OLD.language, OLD.length, lower(TG_OP);
		END IF;
		IF TG_OP = 'DELETE' THEN
			RETURN OLD;
		END IF;
		-- And the other direction: a future Daily may not be dragged onto a day
		-- that has already started, which would rewrite it just as thoroughly.
		IF NEW.day <= wordlex_day() THEN
			RAISE EXCEPTION 'daily for %-% cannot move onto %, which is already live (ADR 0019)',
				NEW.language, NEW.length, NEW.day;
		END IF;
		RETURN NEW;
	END;
	$$;
--> statement-breakpoint
CREATE TRIGGER daily_frozen
	BEFORE UPDATE OR DELETE ON daily
	FOR EACH ROW
	EXECUTE FUNCTION wordlex_daily_is_frozen();
--> statement-breakpoint
-- What runs at every rollover, in this order. Topping a seven-day buffer rather
-- than issuing tomorrow is what makes it idempotent: miss three runs and the
-- next one catches up on its own, with no "am I nearly empty" check to get wrong.
--
-- The Tracks come from the `word` table rather than a list copied out of
-- packages/domain/src/track.ts — and from every Track it knows a word for, not
-- just the ones with an Answer Pool, so a Track seeded with a Dictionary and no
-- pool is reported below instead of quietly skipped. The loop is a loop and not one set-returning
-- SELECT so that each issued Daily is visible to the next call — otherwise one
-- run could hand the same word to two different days of the same Rotation.
CREATE FUNCTION wordlex_rollover() RETURNS void
	LANGUAGE plpgsql
	AS $$
	DECLARE
		t record;
		target date;
	BEGIN
		FOR t IN
			SELECT tracks.language, tracks.length, buffer.ahead
			FROM (SELECT DISTINCT language, length FROM word) AS tracks
			CROSS JOIN generate_series(0, 6) AS buffer(ahead)
		LOOP
			target := wordlex_day() + t.ahead;
			PERFORM wordlex_issue_daily(t.language, t.length, target);
			-- Using up a Rotation is normal and starts the next one, so the only
			-- way to get no Daily is a Track with no Answer Pool at all. That is
			-- a broken seed rather than a full one, and it would otherwise fail
			-- in silence; this at least puts it in cron.job_run_details.
			IF NOT EXISTS (
				SELECT 1 FROM daily x
				WHERE x.language = t.language AND x.length = t.length AND x.day = target
			) THEN
				RAISE WARNING 'no Daily for %-% on %: that Track has no Answer Pool',
					t.language, t.length, target;
			END IF;
		END LOOP;

		-- Then sweep Games still playing whose Daily has passed, so no stale row
		-- outlives its day. Abandoned stays distinct from a loss because ADR 0012's
		-- Solve Rate counts Games won, and walking away is weaker evidence about an
		-- Answer than spending every Guess.
		UPDATE game
		SET status = 'abandoned'
		FROM daily d
		WHERE game.daily_id = d.id
			AND game.status = 'playing'
			AND d.day < wordlex_day();
	END;
	$$;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_cron;
--> statement-breakpoint
-- 00:00 WIB. pg_cron reads schedules in GMT unless cron.timezone says otherwise,
-- so 17:00 is midnight in Jakarta whatever the server's own clock is set to.
SELECT cron.schedule('wordlex-rollover', '0 17 * * *', 'SELECT wordlex_rollover()');
