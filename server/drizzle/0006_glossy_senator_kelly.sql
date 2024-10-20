CREATE TABLE IF NOT EXISTS "word_group" (
	"id" text PRIMARY KEY NOT NULL,
	"length" integer NOT NULL,
	"last_modified" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "alphagram" ADD COLUMN "word_group_id" text NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "alphagram" ADD CONSTRAINT "alphagram_word_group_id_word_group_id_fk" FOREIGN KEY ("word_group_id") REFERENCES "public"."word_group"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "alphagram" DROP COLUMN IF EXISTS "length";