import "server-only";
import type { Prisma } from "@/generated/prisma/client";
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
    await recordAnalytics(event);
    return { duplicate: false, stored: false };
  }
  const secret =
    process.env.ANALYTICS_HASH_SECRET ||
    process.env.JWT_SECRET ||
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
  const now = new Date();
  const day = new Date(now.toISOString().slice(0, 10));
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
      const budget = await tx.analyticsCaptureDay.upsert({
        where: { day },
        create: { day },
        update: {},
      });
      if (budget.events >= DETAIL_DAILY_LIMIT) {
        await recordAnalytics(event, tx);
        return { duplicate: false, stored: false };
      }
      await tx.analyticsCaptureDay.update({
        where: { day },
        data: { events: { increment: 1 } },
      });
      const attributes = {
        lastSeen: now,
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
        create: { id: keys.visitorId, ...attributes },
        update: attributes,
      });
      const increments = {
        pageviews: event.type === "pageview" ? 1 : 0,
        clicks: event.type === "click" ? 1 : 0,
        contacts: event.type === "contact" ? 1 : 0,
        activeMs: event.type === "engagement" ? context.activeMs : 0,
      };
      await tx.analyticsSession.upsert({
        where: { id: keys.sessionId },
        create: {
          id: keys.sessionId,
          visitorId: keys.visitorId,
          entryPath: event.path,
          exitPath: event.path,
          referrer: event.referrer || "Direct",
          campaignSource: context.campaignSource,
          campaignMedium: context.campaignMedium,
          campaignName: context.campaignName,
          ...increments,
        },
        update: {
          lastSeen: now,
          exitPath: event.path,
          pageviews: { increment: increments.pageviews },
          clicks: { increment: increments.clicks },
          contacts: { increment: increments.contacts },
          activeMs: { increment: increments.activeMs },
        },
      });
      await tx.analyticsVisitEvent.create({
        data: {
          id: keys.eventId,
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
      await recordAnalytics(event, tx);
      return { duplicate: false, stored: true };
    },
    { timeout: 10_000 },
  );
  if (Date.now() - cleanedAt > 60 * 60 * 1000) await pruneVisitorAnalytics();
  await pruneAggregateAnalytics();
  return result;
}

export async function visitorReport(days: number) {
  // Prune before reads too: no new traffic is required to enforce detail retention.
  if (Date.now() - cleanedAt > 60 * 60 * 1000) await pruneVisitorAnalytics();
  const start = new Date(
    Math.max(
      analyticsWindow(days).start.getTime(),
      Date.now() - VISITOR_RETENTION_DAYS * 86_400_000,
    ),
  );
  const where = { lastSeen: { gte: start } };
  const [
    visitors,
    sessions,
    engaged,
    contacts,
    active,
    metrics,
    live,
    countries,
    browsers,
    systems,
    captured,
    landing,
    exits,
    campaigns,
    performancePages,
    deepReads,
  ] = await Promise.all([
    prisma.analyticsVisitor.count({
      where: {
        sessions: { some: { events: { some: { createdAt: { gte: start } } } } },
      },
    }),
    prisma.analyticsSession.count({ where }),
    prisma.analyticsSession.count({
      where: {
        ...where,
        OR: [
          { activeMs: { gte: 10000 } },
          { pageviews: { gt: 1 } },
          { contacts: { gt: 0 } },
        ],
      },
    }),
    prisma.analyticsSession.count({ where: { ...where, contacts: { gt: 0 } } }),
    prisma.analyticsSession.aggregate({ where, _avg: { activeMs: true } }),
    prisma.analyticsVisitEvent.aggregate({
      where: { createdAt: { gte: start }, loadMs: { gt: 0 } },
      _avg: { loadMs: true },
      _count: true,
    }),
    prisma.analyticsVisitor.count({
      where: { lastSeen: { gte: new Date(Date.now() - 5 * 60_000) } },
    }),
    prisma.analyticsVisitor.groupBy({
      by: ["country"],
      where,
      _count: true,
      orderBy: { _count: { country: "desc" } },
      take: 10,
    }),
    prisma.analyticsVisitor.groupBy({
      by: ["browser"],
      where,
      _count: true,
      orderBy: { _count: { browser: "desc" } },
      take: 10,
    }),
    prisma.analyticsVisitor.groupBy({
      by: ["os"],
      where,
      _count: true,
      orderBy: { _count: { os: "desc" } },
      take: 10,
    }),
    prisma.analyticsCaptureDay.aggregate({
      where: { day: { gte: new Date(start.toISOString().slice(0, 10)) } },
      _max: { events: true },
    }),
    prisma.analyticsSession.groupBy({
      by: ["entryPath"],
      where,
      _count: true,
      orderBy: { _count: { entryPath: "desc" } },
      take: 10,
    }),
    prisma.analyticsSession.groupBy({
      by: ["exitPath"],
      where,
      _count: true,
      orderBy: { _count: { exitPath: "desc" } },
      take: 10,
    }),
    prisma.analyticsSession.groupBy({
      by: ["campaignName", "campaignSource", "campaignMedium"],
      where: {
        ...where,
        OR: [{ campaignName: { not: "" } }, { campaignSource: { not: "" } }],
      },
      _count: true,
      orderBy: { _count: { campaignName: "desc" } },
      take: 10,
    }),
    prisma.analyticsVisitEvent.groupBy({
      by: ["path"],
      where: { createdAt: { gte: start }, loadMs: { gt: 0 } },
      _avg: { loadMs: true },
      _count: true,
      orderBy: { _avg: { loadMs: "desc" } },
      take: 10,
    }),
    prisma.$queryRaw<
      { count: bigint }[]
    >`SELECT COUNT(DISTINCT "session_id") AS count FROM "analytics_visit_events" WHERE "created_at" >= ${start} AND "scroll_depth" >= 90`,
  ]);
  return {
    deepReadSessions: Number(deepReads[0]?.count ?? 0),
    retentionDays: VISITOR_RETENTION_DAYS,
    from: start.toISOString(),
    visitors,
    sessions,
    live,
    engagedSessions: engaged,
    engagementRate: sessions ? Math.round((engaged / sessions) * 100) : 0,
    averageActiveMs: Math.round(active._avg.activeMs ?? 0),
    averageLoadMs: Math.round(metrics._avg.loadMs ?? 0),
    loadSamples: metrics._count,
    contactSessions: contacts,
    countries: countries.map((item) => ({
      label: item.country || "Unknown",
      count: item._count,
    })),
    browsers: browsers.map((item) => ({
      label: item.browser,
      count: item._count,
    })),
    systems: systems.map((item) => ({ label: item.os, count: item._count })),
    landingPages: landing.map((item) => ({
      label: item.entryPath,
      count: item._count,
    })),
    exitPages: exits.map((item) => ({
      label: item.exitPath,
      count: item._count,
    })),
    campaigns: campaigns.map((item) => ({
      label: [item.campaignName, item.campaignSource, item.campaignMedium]
        .filter(Boolean)
        .join(" / "),
      count: item._count,
    })),
    performancePages: performancePages.map((item) => ({
      path: item.path,
      milliseconds: Math.round(item._avg.loadMs ?? 0),
      samples: item._count,
    })),
    dailyDetailLimit: DETAIL_DAILY_LIMIT,
    samplingLimitReached: (captured._max.events ?? 0) >= DETAIL_DAILY_LIMIT,
  };
}
export async function listVisitors(params: URLSearchParams) {
  if (Date.now() - cleanedAt > 60 * 60 * 1000) await pruneVisitorAnalytics();
  const query = (params.get("q") ?? "").trim().slice(0, 120);
  const days = Number(params.get("days") ?? 30);
  const period = [1, 7, 30].includes(days) ? days : 30;
  const cutoff = new Date(Date.now() - VISITOR_RETENTION_DAYS * 86_400_000);
  const page = Math.min(
    10000,
    Math.max(1, Math.floor(Number(params.get("page")) || 1)),
  );
  const where: Prisma.AnalyticsVisitorWhereInput = {
    lastSeen: { gte: new Date(Date.now() - period * 86_400_000) },
    ...(params.get("live") === "true"
      ? { lastSeen: { gte: new Date(Date.now() - 5 * 60_000) } }
      : {}),
    ...(query
      ? {
          OR: ["id", "lastIp", "fingerprint", "browser", "os", "country"].map(
            (key) => ({ [key]: { contains: query, mode: "insensitive" } }),
          ),
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
          select: { sessions: { where: { lastSeen: { gte: cutoff } } } },
        },
        sessions: {
          where: { lastSeen: { gte: cutoff } },
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
            orderBy: { createdAt: "desc" },
            take: 60,
          },
        },
      },
    },
  });
  if (!visitor) return null;
  const similar = await prisma.analyticsVisitor.count({
    where: {
      fingerprint: visitor.fingerprint,
      id: { not: id },
      lastSeen: {
        gte: new Date(Date.now() - VISITOR_RETENTION_DAYS * 86_400_000),
      },
    },
  });
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
