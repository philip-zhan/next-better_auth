-- Add column as nullable first
ALTER TABLE "conversations" ADD COLUMN "public_id" text;--> statement-breakpoint
-- Generate nanoid-like strings for existing rows (21 characters, URL-safe)
-- Using a combination of random() and encode() to create a random string
UPDATE "conversations" SET "public_id" = encode(gen_random_bytes(16), 'base64')
WHERE "public_id" IS NULL;--> statement-breakpoint
-- Replace URL-unsafe characters and trim to 21 chars (nanoid default length)
UPDATE "conversations" SET "public_id" = substring(
  translate("public_id", '/+', '_-'),
  1, 21
) WHERE "public_id" IS NOT NULL;--> statement-breakpoint
-- Make column NOT NULL
ALTER TABLE "conversations" ALTER COLUMN "public_id" SET NOT NULL;--> statement-breakpoint
-- Add unique constraint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_public_id_unique" UNIQUE("public_id");