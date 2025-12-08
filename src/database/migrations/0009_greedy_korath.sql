-- Add column as nullable first
ALTER TABLE "conversations" ADD COLUMN "public_id" text;--> statement-breakpoint
-- Generate nanoid-like strings for existing rows (21 characters, URL-safe)
-- Using md5 hash of random() + id + timestamp to create unique strings
-- md5 produces 32 hex characters, we'll take first 21 which are URL-safe
-- For better uniqueness, we'll use a combination that includes the row id
UPDATE "conversations" SET "public_id" = substring(
  md5(random()::text || id::text || clock_timestamp()::text),
  1, 21
)
WHERE "public_id" IS NULL;--> statement-breakpoint
-- Make column NOT NULL
ALTER TABLE "conversations" ALTER COLUMN "public_id" SET NOT NULL;--> statement-breakpoint
-- Add unique constraint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_public_id_unique" UNIQUE("public_id");