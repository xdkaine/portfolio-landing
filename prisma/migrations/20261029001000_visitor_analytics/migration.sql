-- CreateTable
CREATE TABLE "analytics_visitors" (
    "id" TEXT NOT NULL,
    "first_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_ip" VARCHAR(45),
    "ip_source" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT '',
    "browser" TEXT NOT NULL,
    "os" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "user_agent" VARCHAR(512) NOT NULL,
    "signals" JSONB NOT NULL,

    CONSTRAINT "analytics_visitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_sessions" (
    "id" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entry_path" TEXT NOT NULL,
    "exit_path" TEXT NOT NULL,
    "referrer" TEXT NOT NULL,
    "campaign_source" TEXT NOT NULL DEFAULT '',
    "campaign_medium" TEXT NOT NULL DEFAULT '',
    "campaign_name" TEXT NOT NULL DEFAULT '',
    "pageviews" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "contacts" INTEGER NOT NULL DEFAULT 0,
    "active_ms" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "analytics_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_visit_events" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "destination" TEXT NOT NULL DEFAULT '',
    "label" TEXT NOT NULL DEFAULT '',
    "ip" VARCHAR(45),
    "ip_source" TEXT NOT NULL,
    "active_ms" INTEGER NOT NULL DEFAULT 0,
    "scroll_depth" INTEGER NOT NULL DEFAULT 0,
    "load_ms" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "analytics_visit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_capture_days" (
    "day" DATE NOT NULL,
    "events" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "analytics_capture_days_pkey" PRIMARY KEY ("day")
);

-- CreateIndex
CREATE INDEX "analytics_visitors_last_seen_idx" ON "analytics_visitors"("last_seen");

-- CreateIndex
CREATE INDEX "analytics_visitors_fingerprint_idx" ON "analytics_visitors"("fingerprint");

-- CreateIndex
CREATE INDEX "analytics_visitors_last_ip_idx" ON "analytics_visitors"("last_ip");

-- CreateIndex
CREATE INDEX "analytics_sessions_last_seen_idx" ON "analytics_sessions"("last_seen");

-- CreateIndex
CREATE INDEX "analytics_sessions_visitor_id_started_at_idx" ON "analytics_sessions"("visitor_id", "started_at");

-- CreateIndex
CREATE INDEX "analytics_visit_events_created_at_idx" ON "analytics_visit_events"("created_at");

-- CreateIndex
CREATE INDEX "analytics_visit_events_session_id_created_at_idx" ON "analytics_visit_events"("session_id", "created_at");

-- AddForeignKey
ALTER TABLE "analytics_sessions" ADD CONSTRAINT "analytics_sessions_visitor_id_fkey" FOREIGN KEY ("visitor_id") REFERENCES "analytics_visitors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_visit_events" ADD CONSTRAINT "analytics_visit_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "analytics_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
