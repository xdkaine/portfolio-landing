import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "./prisma";
import {
  analyticsWindow,
  summarizeAnalytics,
  type AnalyticsEvent,
} from "./analytics";

let cleanedDay = "";
export async function recordAnalytics(event: AnalyticsEvent) {
  const day = new Date(new Date().toISOString().slice(0, 10));
  // Labels are presentation only; changing link text cannot multiply stored dimensions.
  const key = createHash("sha256")
    .update(
      JSON.stringify([
        event.type,
        event.path,
        event.destination,
        event.referrer,
        event.device,
      ]),
    )
    .digest("hex");
  const where = { day_key: { day, key } };
  const data = { day, key, ...event, count: 1 };
  const existing = await prisma.analyticsDaily.findUnique({
    where,
    select: { key: true },
  });
  if (existing)
    await prisma.analyticsDaily.update({
      where,
      data: { count: { increment: 1 } },
    });
  else
    await prisma.$transaction(async (tx) => {
      // Serialize dimension admission, while established counters remain concurrent and atomic.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(71628419)`;
      const admitted = await tx.analyticsDaily.findUnique({
        where,
        select: { key: true },
      });
      if (
        !admitted &&
        (await tx.analyticsDaily.count({ where: { day } })) >= 2000
      )
        return;
      await tx.analyticsDaily.upsert({
        where,
        create: data,
        update: { count: { increment: 1 } },
      });
    });
  if (cleanedDay !== day.toISOString()) {
    await prisma.analyticsDaily.deleteMany({
      where: { day: { lt: analyticsWindow(90).previousStart } },
    });
    cleanedDay = day.toISOString();
  }
}
export async function analyticsReport(days: number) {
  const { previousStart, end } = analyticsWindow(days);
  const rows = await prisma.analyticsDaily.findMany({
    where: { day: { gte: previousStart, lt: end } },
  });
  return summarizeAnalytics(rows, days);
}
