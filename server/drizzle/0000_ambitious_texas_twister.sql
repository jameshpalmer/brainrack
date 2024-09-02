CREATE TABLE IF NOT EXISTS "message" (
	"id" text PRIMARY KEY NOT NULL,
	"sender" text,
	"content" text,
	"ord" integer,
	"deleted" boolean,
	"version" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "replicache_client" (
	"id" text PRIMARY KEY NOT NULL,
	"client_group_id" text,
	"last_mutation_id" integer,
	"version" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "replicache_server" (
	"id" integer PRIMARY KEY NOT NULL,
	"version" integer
);
