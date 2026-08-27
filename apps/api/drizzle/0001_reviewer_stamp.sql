-- ADR 0018's two reviewer verdicts are "not a real word" (`status = 'rejected'`)
-- and "real word, terrible Answer" (`in_answer_pool = false`) — and neither of
-- them touches `reviewed_at` or `source`. That left the seed's promise never to
-- overwrite a human resting on the human also remembering to stamp two columns
-- nobody told them about. Doing the common verdict and nothing else meant the
-- next seed quietly put the word back in the pool.
--
-- So the stamp is not the reviewer's job. Any hand-made change to either column
-- marks the row as theirs, and the seed skips it from then on. The seed says so
-- explicitly; everything else is a person.
CREATE FUNCTION wordlex_word_reviewed() RETURNS trigger
	LANGUAGE plpgsql
	AS $$
	BEGIN
		IF current_setting('wordlex.seeding', true) = 'on' THEN
			RETURN NEW;
		END IF;
		IF NEW.status IS DISTINCT FROM OLD.status
			OR NEW.in_answer_pool IS DISTINCT FROM OLD.in_answer_pool
		THEN
			NEW.source := 'reviewer';
			NEW.reviewed_at := now();
		END IF;
		RETURN NEW;
	END;
	$$;
--> statement-breakpoint
CREATE TRIGGER word_reviewed
	BEFORE UPDATE ON word
	FOR EACH ROW
	EXECUTE FUNCTION wordlex_word_reviewed();
