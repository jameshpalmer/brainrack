CREATE TABLE IF NOT EXISTS "alphagram" (
	"id" text PRIMARY KEY NOT NULL,
	"alphagram" text,
	"length" integer,
	"csw_words" integer,
	"nwl_words" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "word" (
	"id" text PRIMARY KEY NOT NULL,
	"word" text,
	"csw_valid" boolean,
	"nwl_valid" boolean,
	"csw_front_hooks" text,
	"csw_back_hooks" text,
	"playability" integer,
	"alphagram_id" text
);
