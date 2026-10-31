import "server-only";
import { campaignIsQa, trafficFilter, type TrafficFilter } from "./analyticsTraffic";
import { CmsError } from "./cmsRules";
import { analyticsBucketKey } from "./analyticsStore";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "./prisma";
import { analyticsWindow, type AnalyticsEvent } from "./analytics";
import { recordAnalytics, pruneAggregateAnalytics } from "./analyticsStore";
import {
  browserFamily,
  normalizeVisitorContext,
  visitorKeys,
  visitorNetwork,
  VISITOR_RETENTION_DAYS,
  DETAIL_DAILY_LIMIT,
} from "./visitorIdentity";

let cleanedAt = 0;
export async function pruneVisitorAnalytics(now = new Date()) {
  const cutoff = new Date(now.getTime() - VISITOR_RETENTION_DAYS * 86_400_000);
  await prisma.$transaction([
    prisma.analyticsVisitEvent.deleteMany({
      where: { createdAt: { lt: cutoff } },
    }),
    prisma.analyticsSession.deleteMany({ where: { lastSeen: { lt: cutoff } } }),
    prisma.analyticsVisitor.deleteMany({ where: { lastSeen: { lt: cutoff } } }),
    prisma.analyticsCaptureDay.deleteMany({ where: { day: { lt: cutoff } } }),
    prisma.cmsAuditEvent.updateMany({
      where: { entity: "visitor", createdAt: { lt: cutoff }, entityId: { not: "" } },
      data: { entityId: "" },
    }),
  ]);
  cleanedAt = now.getTime();
}
export async function captureVisitorEvent(
  event: AnalyticsEvent,
  raw: unknown,
  headers: Headers,
) {
  if (
    raw === false ||
    headers.get("dnt") === "1" ||
    headers.get("sec-gpc") === "1"
  )
    return { duplicate: false, stored: false };
  const context = normalizeVisitorContext(raw);
  if (!context) {
    await recordAnalytics(event, undefined, "unclassified");
    return { duplicate: false, stored: false };
  }
  const secret =
    process.env.ANALYTICS_HASH_SECRET ||
    (process.env.NODE_ENV !== "production" ? process.env.JWT_SECRET : "") ||
    (process.env.NODE_ENV !== "production"
      ? "development-analytics-only-0123456789abcdef"
      : "");
  const userAgent = (headers.get("user-agent") ?? "").slice(0, 512);
  const keys = visitorKeys(context, userAgent, secret);
  // Production's verified ClusterIP app is reachable only through its Nginx ingress.
  // Other deployments must explicitly configure their trusted proxy boundary.
  const trustProxy =
    process.env.ANALYTICS_TRUST_PROXY === "true" ||
    (process.env.ANALYTICS_TRUST_PROXY === undefined &&
      process.env.NODE_ENV === "production");
  const network = visitorNetwork(headers, trustProxy);

  const agent = browserFamily(userAgent);
  const device =
    event.device !== "other"
      ? event.device
      : /iPad|Tablet/i.test(userAgent)
        ? "tablet"
        : /Mobi/i.test(userAgent)
          ? "mobile"
          : userAgent
            ? "desktop"
            : "other";
  const result = await prisma.$transaction(
    async (tx) => {
      // One admission lock establishes strict event deduplication and the daily storage cap.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(71628420)`;
      if (
        await tx.analyticsVisitEvent.findUnique({
          where: { id: keys.eventId },
          select: { id: true },
        })
      )
        return { duplicate: true, stored: false };
      // Use one server clock after admission, not a pre-lock application clock.
      const [clock] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
      const now = clock.now;
      const day = new Date(now.toISOString().slice(0, 10));
      const visitor = await tx.analyticsVisitor.findUnique({ where: { id: keys.visitorId } });
      const session = await tx.analyticsSession.findUnique({ where: { id: keys.sessionId } });
      const campaignTraffic = session?.traffic === "qa" || campaignIsQa(context) ? "qa" : "public";
      const traffic = visitor?.isQa ? "qa" : campaignTraffic;
      const budget = await tx.analyticsCaptureDay.upsert({
        where: { day },
        create: { day },
        update: {},
      });
      if (budget.events >= DETAIL_DAILY_LIMIT) {
        await recordAnalytics(event, tx, traffic, now);
        return { duplicate: false, stored: false };
      }
      await tx.analyticsCaptureDay.update({
        where: { day },
        data: { events: { increment: 1 } },
      });
      const attributes = {
        lastSeen: new Date(Math.max(now.getTime(), visitor?.lastSeen.getTime() ?? 0)),
        lastIp: network.ip,
        ipSource: network.ipSource,
        country: network.country,
        ...agent,
        device,
        fingerprint: keys.fingerprint,
        userAgent,
        signals: context.signals as unknown as Prisma.InputJsonValue,
      };
      await tx.analyticsVisitor.upsert({
        where: { id: keys.visitorId },
        create: { id: keys.visitorId, firstSeen: now, ...attributes },
        update: attributes,
      });
      const increments = {
        pageviews: event.type === "pageview" ? 1 : 0,
        clicks: event.type === "click" ? 1 : 0,
        contacts: event.type === "contact" ? 1 : 0,
        activeMs: event.type === "engagement" ? context.activeMs : 0,
      };
      const occurredAt = context.occurredAt && Math.abs(context.occurredAt - now.getTime()) <= 5 * 60_000
        ? new Date(Math.min(now.getTime(), context.occurredAt)) : now;
      const pageview = event.type === "pageview";
      const earlierPage = pageview && (!session?.pageviews || (context.clientSequence > 0 && session.entrySequence > 0 && context.clientSequence < session.entrySequence));
      const laterPage = pageview && (!session?.pageviews || context.clientSequence === 0 && session.exitSequence === 0 || context.clientSequence > (session?.exitSequence ?? 0));
      await tx.analyticsSession.upsert({
        where: { id: keys.sessionId },
        create: {
          id: keys.sessionId,
          visitorId: keys.visitorId,
          startedAt: now,
          lastSeen: now,
          traffic: campaignTraffic,
          entrySequence: pageview ? context.clientSequence : 0,
          exitSequence: pageview ? context.clientSequence : 0,
          entryPath: event.path,
          exitPath: event.path,
          referrer: event.referrer || "Direct",
          campaignSource: context.campaignSource,
          campaignMedium: context.campaignMedium,
          campaignName: context.campaignName,
          ...increments,
        },
        update: {
          lastSeen: new Date(Math.max(now.getTime(), session?.lastSeen.getTime() ?? 0)),
          traffic: campaignTraffic,
          ...(earlierPage ? { entryPath: event.path, entrySequence: context.clientSequence } : {}),
          ...(laterPage ? { exitPath: event.path, exitSequence: context.clientSequence } : {}),
          pageviews: { increment: increments.pageviews },
          clicks: { increment: increments.clicks },
          contacts: { increment: increments.contacts },
          activeMs: { increment: increments.activeMs },
        },
      });
      if (session && session.traffic !== campaignTraffic) await reclassifyVisitorAggregates(tx, keys.visitorId, visitor?.isQa ?? false);
      const aggregate = await recordAnalytics(event, tx, traffic, now);
      await tx.analyticsVisitEvent.create({
        data: {
          id: keys.eventId,
          createdAt: now,
          occurredAt,
          clientSequence: context.clientSequence,
          fingerprint: keys.fingerprint,
          aggregateKey: aggregate?.key ?? "",
          sessionId: keys.sessionId,
          type: event.type,
          path: event.path,
          destination: event.destination,
          label: event.label,
          ip: network.ip,
          ipSource: network.ipSource,
          activeMs: increments.activeMs,
          scrollDepth: context.scrollDepth,
          loadMs:
            event.type === "pageview" || event.type === "engagement"
              ? context.loadMs
              : 0,
        },
      });
      return { duplicate: false, stored: true };
    },
    { timeout: 10_000 },
  );
  if (Date.now() - cleanedAt > 60 * 60 * 1000) await pruneVisitorAnalytics();
  await pruneAggregateAnalytics();
  return result;
}

function sessionTrafficWhere(traffic: TrafficFilter): Prisma.AnalyticsSessionWhereInput {
  return traffic === "all" ? {} : traffic === "qa"
    ? { OR: [{ traffic: "qa" }, { visitor: { isQa: true } }] }
    : { traffic: "public", visitor: { isQa: false } };
}
function trafficSql(traffic: TrafficFilter) {
  return traffic === "all" ? Prisma.empty : traffic === "qa"
    ? Prisma.sql`AND (s.traffic = 'qa' OR v.is_qa)`
    : Prisma.sql`AND s.traffic = 'public' AND NOT v.is_qa`;
}
export async function visitorReport(days: number, traffic: TrafficFilter = "all") {
  if (Date.now() - cleanedAt > 60 * 60 * 1000) await pruneVisitorAnalytics();
  const now = new Date();
  const start = new Date(Math.max(analyticsWindow(days, now).start.getTime(), now.getTime() - VISITOR_RETENTION_DAYS * 86_400_000));
  const end = now;
  // Only event activity received inside the selected window contributes to
  // engagement, conversions and page rankings. Lifetime session counters do not.
  const filter = trafficSql(traffic);
  type Rank = { label: string; count: number }[];
  type WindowSummary = {
    visitors: number; sessions: number; newVisitors: number; returningVisitors: number;
    returningSessions: number; deepReadSessions: number; engagedSessions: number;
    contactSessions: number; activeMsTotal: number; loadMsTotal: number; loadSamples: number;
    countries: Rank; browsers: Rank; systems: Rank; landingPages: Rank; exitPages: Rank; campaigns: Rank;
  };
  const [summaryRows, captured, performance, liveRows, repeatDays] = await Promise.all([
    prisma.$queryRaw<{ report: WindowSummary }[]>(Prisma.sql`
      WITH window_sessions AS (SELECT s.id, s.visitor_id, v.first_seen, s.started_at,
        s.campaign_name, s.campaign_source, s.campaign_medium, v.country, v.browser, v.os,
        COUNT(*) FILTER (WHERE e.type = 'pageview') AS pageviews,
        COUNT(*) FILTER (WHERE e.type = 'contact') AS contacts,
        SUM(e.active_ms) AS active_ms, MAX(e.scroll_depth) AS scroll_depth,
        SUM(e.load_ms) AS load_total, COUNT(*) FILTER (WHERE e.load_ms > 0) AS load_samples,
        (ARRAY_AGG(e.path ORDER BY e.client_sequence, e.occurred_at, e.created_at, e.id) FILTER (WHERE e.type = 'pageview'))[1] AS entry_path,
        (ARRAY_AGG(e.path ORDER BY e.client_sequence DESC, e.occurred_at DESC, e.created_at DESC, e.id DESC) FILTER (WHERE e.type = 'pageview'))[1] AS exit_path,
        EXISTS (SELECT 1 FROM analytics_sessions prior WHERE prior.visitor_id = s.visitor_id
          AND prior.started_at < s.started_at AND prior.last_seen >= ${new Date(now.getTime() - VISITOR_RETENTION_DAYS * 86_400_000)}
          AND (${traffic} = 'all' OR CASE WHEN v.is_qa THEN 'qa' ELSE prior.traffic END = ${traffic})) AS is_returning
      FROM analytics_visit_events e JOIN analytics_sessions s ON s.id = e.session_id
      JOIN analytics_visitors v ON v.id = s.visitor_id
      WHERE e.created_at >= ${start} AND e.created_at <= ${end} ${filter}
      GROUP BY s.id, v.id
      )
      SELECT json_build_object(
        'visitors', (SELECT COUNT(DISTINCT visitor_id) FROM window_sessions),
        'sessions', (SELECT COUNT(*) FROM window_sessions),
        'newVisitors', (SELECT COUNT(DISTINCT visitor_id) FROM window_sessions WHERE first_seen >= ${start}),
        'returningVisitors', (SELECT COUNT(DISTINCT visitor_id) FROM window_sessions WHERE is_returning),
        'returningSessions', (SELECT COUNT(*) FROM window_sessions WHERE is_returning),
        'deepReadSessions', (SELECT COUNT(*) FROM window_sessions WHERE scroll_depth >= 90),
        'engagedSessions', (SELECT COUNT(*) FROM window_sessions WHERE active_ms >= 10000 OR pageviews > 1 OR contacts > 0),
        'contactSessions', (SELECT COUNT(*) FROM window_sessions WHERE contacts > 0),
        'activeMsTotal', (SELECT COALESCE(SUM(active_ms),0) FROM window_sessions),
        'loadMsTotal', (SELECT COALESCE(SUM(load_total),0) FROM window_sessions),
        'loadSamples', (SELECT COALESCE(SUM(load_samples),0) FROM window_sessions),
        'countries', (SELECT COALESCE(json_agg(r ORDER BY count DESC,label),'[]'::json) FROM (SELECT COALESCE(NULLIF(country,''),'Unknown') AS label,COUNT(DISTINCT visitor_id) AS count FROM window_sessions GROUP BY country ORDER BY count DESC,label LIMIT 10) r),
        'browsers', (SELECT COALESCE(json_agg(r ORDER BY count DESC,label),'[]'::json) FROM (SELECT browser AS label,COUNT(DISTINCT visitor_id) AS count FROM window_sessions GROUP BY browser ORDER BY count DESC,label LIMIT 10) r),
        'systems', (SELECT COALESCE(json_agg(r ORDER BY count DESC,label),'[]'::json) FROM (SELECT os AS label,COUNT(DISTINCT visitor_id) AS count FROM window_sessions GROUP BY os ORDER BY count DESC,label LIMIT 10) r),
        'landingPages', (SELECT COALESCE(json_agg(r ORDER BY count DESC,label),'[]'::json) FROM (SELECT entry_path AS label,COUNT(*) AS count FROM window_sessions WHERE entry_path IS NOT NULL GROUP BY entry_path ORDER BY count DESC,label LIMIT 10) r),
        'exitPages', (SELECT COALESCE(json_agg(r ORDER BY count DESC,label),'[]'::json) FROM (SELECT exit_path AS label,COUNT(*) AS count FROM window_sessions WHERE exit_path IS NOT NULL GROUP BY exit_path ORDER BY count DESC,label LIMIT 10) r),
        'campaigns', (SELECT COALESCE(json_agg(r ORDER BY count DESC,label),'[]'::json) FROM (SELECT concat_ws(' / ',NULLIF(campaign_name,''),NULLIF(campaign_source,''),NULLIF(campaign_medium,'')) AS label,COUNT(*) AS count FROM window_sessions WHERE campaign_name<>'' OR campaign_source<>'' OR campaign_medium<>'' GROUP BY campaign_name,campaign_source,campaign_medium ORDER BY count DESC,label LIMIT 10) r)
      ) AS report
    `),
    prisma.analyticsCaptureDay.aggregate({ where: { day: { gte: new Date(start.toISOString().slice(0, 10)) } }, _max: { events: true } }),
    prisma.$queryRaw<{ path: string; milliseconds: number; samples: bigint }[]>(Prisma.sql`
      SELECT e.path, AVG(e.load_ms)::float AS milliseconds, COUNT(*) AS samples
      FROM analytics_visit_events e JOIN analytics_sessions s ON s.id = e.session_id JOIN analytics_visitors v ON v.id = s.visitor_id
      WHERE e.created_at >= ${start} AND e.created_at <= ${end} AND e.load_ms > 0 ${filter}
      GROUP BY e.path ORDER BY AVG(e.load_ms) DESC, e.path LIMIT 10
    `),
    prisma.analyticsVisitor.count({ where: { sessions: { some: { ...sessionTrafficWhere(traffic), events: { some: { createdAt: { gte: new Date(now.getTime() - 5 * 60_000), lte: end } } } } } } }),
    prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT COUNT(*) AS count FROM (
        SELECT s.visitor_id FROM analytics_visit_events e JOIN analytics_sessions s ON s.id = e.session_id JOIN analytics_visitors v ON v.id = s.visitor_id
        WHERE e.created_at >= ${start} AND e.created_at <= ${end} ${filter}
        GROUP BY s.visitor_id HAVING COUNT(DISTINCT (e.created_at)::date) > 1
      ) repeated
    `),
  ]);
  const { activeMsTotal, loadMsTotal, ...summary } = summaryRows[0].report;
  return {
    ...summary,
    traffic, retentionDays: VISITOR_RETENTION_DAYS, from: start.toISOString(), to: end.toISOString(),
    live: liveRows, repeatDayVisitors: Number(repeatDays[0]?.count ?? 0),
    engagementRate: summary.sessions ? Math.round(summary.engagedSessions / summary.sessions * 100) : 0,
    averageActiveMs: summary.sessions ? Math.round(activeMsTotal / summary.sessions) : 0,
    averageLoadMs: summary.loadSamples ? Math.round(loadMsTotal / summary.loadSamples) : 0,
    performancePages: performance.map(row => ({ path: row.path, milliseconds: Math.round(row.milliseconds), samples: Number(row.samples) })),
    dailyDetailLimit: DETAIL_DAILY_LIMIT, samplingLimitReached: (captured._max.events ?? 0) >= DETAIL_DAILY_LIMIT,
  };
}
export async function listVisitors(params: URLSearchParams) {
  if (Date.now() - cleanedAt > 60 * 60 * 1000) await pruneVisitorAnalytics();
  const query = (params.get("q") ?? "").trim().slice(0, 120);
  const searchIp = visitorNetwork(new Headers({ "x-real-ip": query }), true).ip;
  const days = Number(params.get("days") ?? 30);
  const period = [1, 7, 30].includes(days) ? days : 30;
  const cutoff = new Date(Date.now() - VISITOR_RETENTION_DAYS * 86_400_000);
  const page = Math.min(
    10000,
    Math.max(1, Math.floor(Number(params.get("page")) || 1)),
  );
  const traffic = trafficFilter(params.get("traffic"));
  const where: Prisma.AnalyticsVisitorWhereInput = {
    sessions: { some: { ...sessionTrafficWhere(traffic), events: { some: { createdAt: { gte: new Date(Date.now() - period * 86_400_000) } } } } },
    lastSeen: { gte: new Date(Date.now() - period * 86_400_000) },
    ...(params.get("live") === "true"
      ? { lastSeen: { gte: new Date(Date.now() - 5 * 60_000) } }
      : {}),
    ...(query
      ? {
          OR: [
            ...["id", "lastIp", "fingerprint", "browser", "os", "country"].map((key) => ({ [key]: { contains: query, mode: "insensitive" } })),
            { sessions: { some: { ...sessionTrafficWhere(traffic), events: { some: { createdAt: { gte: cutoff }, OR: [searchIp ? { ip: searchIp } : { ip: { contains: query, mode: "insensitive" } }, /^[a-f0-9]{64}$/i.test(query) ? { fingerprint: query.toLowerCase() } : { fingerprint: { contains: query, mode: "insensitive" } }] } } } } },
          ],
        }
      : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.analyticsVisitor.findMany({
      where,
      orderBy: [{ lastSeen: "desc" }, { id: "desc" }],
      skip: (page - 1) * 20,
      take: 20,
      include: {
        _count: {
          select: { sessions: { where: { ...sessionTrafficWhere(traffic), lastSeen: { gte: cutoff } } } },
        },
        sessions: {
          where: { ...sessionTrafficWhere(traffic), lastSeen: { gte: cutoff } },
          orderBy: { lastSeen: "desc" },
          take: 1,
          select: { exitPath: true },
        },
      },
    }),
    prisma.analyticsVisitor.count({ where }),
  ]);
  return {
    items: items.map(({ userAgent: _agent, signals: _signals, ...row }) => {
      void _agent;
      void _signals;
      return row;
    }),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / 20)),
    retentionDays: VISITOR_RETENTION_DAYS,
  };
}
export async function getVisitor(id: string) {
  if (!/^[a-f0-9]{64}$/.test(id)) return null;
  if (Date.now() - cleanedAt > 60 * 60 * 1000) await pruneVisitorAnalytics();
  const visitor = await prisma.analyticsVisitor.findFirst({
    where: {
      id,
      lastSeen: {
        gte: new Date(Date.now() - VISITOR_RETENTION_DAYS * 86_400_000),
      },
    },
    include: {
      sessions: {
        where: {
          lastSeen: {
            gte: new Date(Date.now() - VISITOR_RETENTION_DAYS * 86_400_000),
          },
        },
        orderBy: { lastSeen: "desc" },
        take: 20,
        include: {
          events: {
            where: {
              type: { not: "engagement" },
              createdAt: {
                gte: new Date(Date.now() - VISITOR_RETENTION_DAYS * 86_400_000),
              },
            },
            orderBy: [{ clientSequence: "desc" }, { occurredAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
            take: 60,
          },
        },
      },
    },
  });
  if (!visitor) return null;
  const cutoff = new Date(Date.now() - VISITOR_RETENTION_DAYS * 86_400_000);
  const [ipHistory, fingerprintHistory] = await Promise.all([
    prisma.analyticsVisitEvent.groupBy({ by: ["ip", "ipSource"], where: { session: { visitorId: id }, createdAt: { gte: cutoff }, ip: { not: null } }, _min: { createdAt: true }, _max: { createdAt: true }, _count: true, orderBy: { _max: { createdAt: "desc" } }, take: 50 }),
    prisma.analyticsVisitEvent.groupBy({ by: ["fingerprint"], where: { session: { visitorId: id }, createdAt: { gte: cutoff }, fingerprint: { not: "" } }, _min: { createdAt: true }, _max: { createdAt: true }, _count: true, orderBy: { _max: { createdAt: "desc" } }, take: 50 }),
  ]);
  const fingerprints = [...new Set([visitor.fingerprint, ...fingerprintHistory.map(row => row.fingerprint)])];
  const similar = await prisma.analyticsVisitor.count({ where: { id: { not: id }, lastSeen: { gte: cutoff }, OR: [{ fingerprint: { in: fingerprints } }, { sessions: { some: { events: { some: { fingerprint: { in: fingerprints }, createdAt: { gte: cutoff } } } } } }] } });
  const depths = await prisma.analyticsVisitEvent.groupBy({
    by: ["sessionId"],
    where: {
      sessionId: { in: visitor.sessions.map((session) => session.id) },
      createdAt: {
        gte: new Date(Date.now() - VISITOR_RETENTION_DAYS * 86_400_000),
      },
    },
    _max: { scrollDepth: true },
  });
  return {
    ...visitor,
    ipHistory: ipHistory.map(row => ({ ip: row.ip, ipSource: row.ipSource, firstSeen: row._min.createdAt, lastSeen: row._max.createdAt, observations: row._count })),
    fingerprintHistory: fingerprintHistory.map(row => ({ fingerprint: row.fingerprint, firstSeen: row._min.createdAt, lastSeen: row._max.createdAt, observations: row._count })),
    sessions: visitor.sessions.map((session) => ({
      ...session,
      maxScrollDepth:
        depths.find((row) => row.sessionId === session.id)?._max.scrollDepth ??
        0,
      events: [...session.events].reverse(),
    })),
    similar,
    retentionDays: VISITOR_RETENTION_DAYS,
  };
}

export async function setVisitorQa(id: string, isQa: boolean, expectedIsQa: boolean, actor: string) {
  if (!/^[a-f0-9]{64}$/.test(id)) throw new CmsError("Invalid browser ID");
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(71628420)`;
    const visitor = await tx.analyticsVisitor.findUnique({ where: { id } });
    if (!visitor) throw new CmsError("Visitor not found", 404);
    if (visitor.isQa !== expectedIsQa) throw new CmsError("Classification changed. Refresh the profile.", 409);
    await reclassifyVisitorAggregates(tx, id, isQa);
    await tx.analyticsVisitor.update({ where: { id }, data: { isQa } });
    await tx.cmsAuditEvent.create({ data: { actor, action: "analytics.classify", entity: "visitor", entityId: id, summary: isQa ? "Browser marked as QA/internal" : "Browser QA/internal override removed" } });
  }, { timeout: 30_000 });
}

async function reclassifyVisitorAggregates(tx: Prisma.TransactionClient, id: string, isQa: boolean) {
    const cutoff = new Date(Date.now() - VISITOR_RETENTION_DAYS * 86_400_000);
    // Reclassify only linked, retained observations. Pre-upgrade buckets lack
    // enough dimensions to reconstruct attribution and remain unclassified.
    const events = await tx.analyticsVisitEvent.findMany({ where: { session: { visitorId: id }, createdAt: { gte: cutoff }, aggregateKey: { not: "" } }, select: { id: true, aggregateKey: true, createdAt: true, session: { select: { traffic: true } } } });
    const groups = new Map<string, { day: Date; key: string; traffic: "qa" | "public"; ids: string[] }>();
    for (const event of events) {
      const day = new Date(event.createdAt.toISOString().slice(0, 10));
      const traffic = isQa || event.session.traffic === "qa" ? "qa" : "public";
      const key = `${day.toISOString()}:${event.aggregateKey}:${traffic}`;
      const group = groups.get(key) ?? { day, key: event.aggregateKey, traffic, ids: [] };
      group.ids.push(event.id); groups.set(key, group);
    }
    for (const group of groups.values()) {
      const row = await tx.analyticsDaily.findUnique({ where: { day_key: { day: group.day, key: group.key } } });
      if (!row || row.traffic === group.traffic) continue;
      const key = analyticsBucketKey(row, group.traffic);
      if (row.count < group.ids.length) throw new Error("Aggregate classification count mismatch");
      await tx.analyticsDaily.update({ where: { day_key: { day: group.day, key: row.key } }, data: { count: { decrement: group.ids.length } } });
      await tx.analyticsDaily.upsert({ where: { day_key: { day: group.day, key } }, create: { ...row, key, traffic: group.traffic, count: group.ids.length }, update: { count: { increment: group.ids.length } } });
      await tx.analyticsVisitEvent.updateMany({ where: { id: { in: group.ids } }, data: { aggregateKey: key } });
    }
    await tx.analyticsDaily.deleteMany({ where: { count: 0 } });
}
