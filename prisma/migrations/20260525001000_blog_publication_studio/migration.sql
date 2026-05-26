CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

ALTER TABLE "posts"
ADD COLUMN "body_json" JSONB,
ADD COLUMN "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "published_at" TIMESTAMP(3),
ADD COLUMN "cover_image" TEXT,
ADD COLUMN "cover_alt" TEXT,
ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;

UPDATE "posts"
SET
  "status" = CASE
    WHEN "published" THEN 'PUBLISHED'::"PostStatus"
    ELSE 'DRAFT'::"PostStatus"
  END,
  "published_at" = CASE
    WHEN "published" AND "date" ~ '^\d{4}\.\d{2}\.\d{2}$'
      AND to_char(to_date("date", 'YYYY.MM.DD'), 'YYYY.MM.DD') = "date"
      THEN to_date("date", 'YYYY.MM.DD')::timestamp
    WHEN "published" THEN "created_at"
    ELSE NULL
  END;

CREATE INDEX "posts_status_published_at_idx"
ON "posts" ("status", "published_at" DESC);
