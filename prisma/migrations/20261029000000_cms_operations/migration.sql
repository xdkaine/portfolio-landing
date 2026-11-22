-- Additive migration: previous application images retain compatible fields.
ALTER TABLE "projects" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "deleted_at" TIMESTAMP(3);
ALTER TABLE "posts" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "deleted_at" TIMESTAMP(3), ADD COLUMN "draft_snapshot" JSONB;
CREATE TYPE "MessageStatus" AS ENUM ('NEW', 'OPEN', 'RESOLVED', 'ARCHIVED');
ALTER TABLE "contact_messages" ADD COLUMN "status" "MessageStatus" NOT NULL DEFAULT 'NEW',
  ADD COLUMN "note" TEXT NOT NULL DEFAULT '', ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "contact_messages" SET "status" = 'OPEN' WHERE "read" = true;
CREATE INDEX "contact_messages_status_created_at_idx" ON "contact_messages"("status", "created_at");
CREATE INDEX "contact_messages_read_created_at_idx" ON "contact_messages"("read", "created_at");
CREATE TABLE "post_revisions" (
  "id" TEXT NOT NULL PRIMARY KEY, "post_id" TEXT NOT NULL, "version" INTEGER NOT NULL,
  "snapshot" JSONB NOT NULL, "actor" TEXT NOT NULL, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "post_revisions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "post_revisions_post_id_version_key" ON "post_revisions"("post_id", "version");
CREATE TABLE "cms_audit_events" (
  "id" TEXT NOT NULL PRIMARY KEY, "actor" TEXT NOT NULL, "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL, "entity_id" TEXT NOT NULL, "summary" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "cms_audit_events_created_at_idx" ON "cms_audit_events"("created_at");
CREATE TABLE "analytics_daily" (
  "day" DATE NOT NULL, "key" TEXT NOT NULL, "type" TEXT NOT NULL, "path" TEXT NOT NULL,
  "destination" TEXT NOT NULL DEFAULT '', "label" TEXT NOT NULL DEFAULT '',
  "referrer" TEXT NOT NULL DEFAULT '', "device" TEXT NOT NULL DEFAULT 'other', "count" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "analytics_daily_pkey" PRIMARY KEY ("day", "key")
);
CREATE INDEX "analytics_daily_day_type_idx" ON "analytics_daily"("day", "type");
