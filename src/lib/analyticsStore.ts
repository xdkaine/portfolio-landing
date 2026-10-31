import type { Prisma } from "@/generated/prisma/client";
import "server-only";
import type { TrafficClass, TrafficFilter } from "./analyticsTraffic";
import { createHash } from "node:crypto";
import { prisma } from "./prisma";
import {
  analyticsWindow,
  summarizeAnalytics,
  type AnalyticsEvent,
} from "./analytics";
let cleanedDay = "";
export async function pruneAggregateAnalytics() {
  const today = new Date().toISOString().slice(0, 10);
  if (cleanedDay === today) return;
  await prisma.analyticsDaily.deleteMany({
    where: { day: { lt: analyticsWindow(90).previousStart } },
  });
  cleanedDay = today;
}
export function analyticsBucketKey(event: Omit<AnalyticsEvent, "type"> & { type: string }, traffic: TrafficClass) {
  return createHash("sha256").update(JSON.stringify([event.type, event.path, event.destination, event.referrer, event.device, traffic])).digest("hex");
}
export async function recordAnalytics(
  event: AnalyticsEvent,
  transaction?: Prisma.TransactionClient,
  traffic: TrafficClass = "public",
  at = new Date(),
) {
  if (event.type === "engagement") return;
  const day = new Date(at.toISOString().slice(0, 10));
  const key = analyticsBucketKey(event, traffic);
  const where = { day_key: { day, key } };
  const write = async (tx: Prisma.TransactionClient) => {
    const existing = await tx.analyticsDaily.findUnique({
      where,
      select: { key: true },
    });
    if (existing) {
      await tx.analyticsDaily.update({
        where,
        data: { count: { increment: 1 } },
      });
      return true;
    }
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(71628419)`;
    const admitted = await tx.analyticsDaily.findUnique({
      where,
      select: { key: true },
    });
    if (
      !admitted &&
      (await tx.analyticsDaily.count({ where: { day } })) >= 2000
    )
      return false;
    await tx.analyticsDaily.upsert({
      where,
      create: { day, key, ...event, traffic, count: 1 },
      update: { count: { increment: 1 } },
    });
    return true;
  };
  let admitted: boolean;
  if (transaction) admitted = await write(transaction);
  else {
    admitted = await prisma.$transaction(write);
    await pruneAggregateAnalytics();
  }
  return admitted ? { day, key } : null;
}
export async function analyticsReport(days: number, traffic: TrafficFilter = "all") {
  const { previousStart, end } = analyticsWindow(days);
  const rows = await prisma.analyticsDaily.findMany({
    where: { day: { gte: previousStart, lt: end }, ...(traffic === "all" ? {} : { traffic }) },
  });
  const unknown = await prisma.analyticsDaily.aggregate({ where: { day: { gte: previousStart, lt: end }, traffic: "unclassified" }, _sum: { count: true } });
  return { ...summarizeAnalytics(rows, days), traffic, unclassifiedEvents: unknown._sum.count ?? 0 };
}
