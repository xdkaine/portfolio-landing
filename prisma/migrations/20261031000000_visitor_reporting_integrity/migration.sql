ALTER TABLE "analytics_daily" ADD COLUMN "traffic" TEXT NOT NULL DEFAULT 'unclassified';
ALTER TABLE "analytics_visitors" ADD COLUMN "is_qa" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "analytics_sessions" ADD COLUMN "traffic" TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN "entry_sequence" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "exit_sequence" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "analytics_visit_events" ADD COLUMN "occurred_at" TIMESTAMP(3),
  ADD COLUMN "client_sequence" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "fingerprint" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "aggregate_key" TEXT NOT NULL DEFAULT '';
UPDATE "analytics_visit_events" SET "occurred_at" = "created_at";
ALTER TABLE "analytics_visit_events" ALTER COLUMN "occurred_at" SET NOT NULL,
  ALTER COLUMN "occurred_at" SET DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "analytics_visit_events_ip_created_at_idx" ON "analytics_visit_events"("ip", "created_at");
CREATE INDEX "analytics_visit_events_fingerprint_created_at_idx" ON "analytics_visit_events"("fingerprint", "created_at");

-- Recover navigation state from retained pageviews only. Historical receipt
-- order cannot reconstruct an unrecorded client occurrence time.
UPDATE "analytics_sessions" s SET "entry_path" = p.path FROM (
  SELECT DISTINCT ON (session_id) session_id, path FROM analytics_visit_events
  WHERE type = 'pageview' ORDER BY session_id, created_at, id
) p WHERE p.session_id = s.id;
UPDATE "analytics_sessions" s SET "exit_path" = p.path FROM (
  SELECT DISTINCT ON (session_id) session_id, path FROM analytics_visit_events
  WHERE type = 'pageview' ORDER BY session_id, created_at DESC, id DESC
) p WHERE p.session_id = s.id;
UPDATE analytics_visitors v SET first_seen = LEAST(first_seen, last_seen),
  last_seen = GREATEST(last_seen, COALESCE((SELECT MAX(e.created_at) FROM analytics_visit_events e JOIN analytics_sessions s ON s.id = e.session_id WHERE s.visitor_id = v.id), last_seen));
UPDATE analytics_sessions s SET last_seen = GREATEST(started_at, last_seen,
  COALESCE((SELECT MAX(e.created_at) FROM analytics_visit_events e WHERE e.session_id = s.id), last_seen));

-- Explicit campaign tags only; never classify by shared IP or fingerprint.
UPDATE analytics_sessions SET traffic = 'qa'
WHERE lower(campaign_source) IN ('qa', 'test', 'internal')
   OR lower(campaign_medium) IN ('qa', 'test', 'internal', 'visitor-audit')
   OR campaign_name ~* '^(qa|visitor-audit)([- ]|$)';
