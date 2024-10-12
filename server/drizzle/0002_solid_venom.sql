ALTER TABLE "alphagram" ALTER COLUMN "alphagram" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "alphagram" ALTER COLUMN "length" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "alphagram" ALTER COLUMN "csw_words" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "alphagram" ALTER COLUMN "nwl_words" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "word" ALTER COLUMN "word" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "word" ALTER COLUMN "csw_valid" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "word" ALTER COLUMN "nwl_valid" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "word" ALTER COLUMN "playability" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "word" ALTER COLUMN "alphagram_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "word" ADD COLUMN "definition" text;--> statement-breakpoint
ALTER TABLE "word" DROP COLUMN IF EXISTS "csw_front_hooks";--> statement-breakpoint
ALTER TABLE "word" DROP COLUMN IF EXISTS "csw_back_hooks";