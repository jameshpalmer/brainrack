CREATE TABLE IF NOT EXISTS "conversation" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text,
	"last_modified" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "replicache_client" ALTER COLUMN "last_mutation_id" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "replicache_client" ALTER COLUMN "last_mutation_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "replicache_client_group" ALTER COLUMN "cvr_version" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "alphagram" ADD COLUMN "last_modified" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "game" ADD COLUMN "last_modified" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "conversation_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN "last_modified" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "replicache_client" ADD COLUMN "last_modified" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "replicache_client_group" ADD COLUMN "last_modified" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_modified" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "word" ADD COLUMN "last_modified" timestamp DEFAULT now();--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversation" ADD CONSTRAINT "conversation_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "message" ADD CONSTRAINT "message_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
