CREATE TABLE "badge" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "badge_award" ADD CONSTRAINT "badge_award_badge_badge_id_fk" FOREIGN KEY ("badge") REFERENCES "public"."badge"("id") ON DELETE restrict ON UPDATE no action;