CREATE TABLE IF NOT EXISTS "game" (
	"id" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "replicache_client_group" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"cvr_version" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "replicache_client_group" ADD CONSTRAINT "replicache_client_group_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "word" ADD CONSTRAINT "word_alphagram_id_alphagram_id_fk" FOREIGN KEY ("alphagram_id") REFERENCES "public"."alphagram"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "message" DROP COLUMN IF EXISTS "version";--> statement-breakpoint
ALTER TABLE "replicache_client" DROP COLUMN IF EXISTS "version";