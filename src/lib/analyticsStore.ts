import type { Prisma } from "@/generated/prisma/client";
import "server-only";
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
export async function recordAnalytics(
  event: AnalyticsEvent,
  transaction?: Prisma.TransactionClient,
) {
  if (event.type === "engagement") return;
  const day = new Date(new Date().toISOString().slice(0, 10));
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
      return;
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
      return;
    await tx.analyticsDaily.upsert({
      where,
      create: { day, key, ...event, count: 1 },
      update: { count: { increment: 1 } },
    });
  };
  if (transaction) await write(transaction);
  else {
    await prisma.$transaction(write);
    await pruneAggregateAnalytics();
  }
}
export async function analyticsReport(days: number) {
  const { previousStart, end } = analyticsWindow(days);
  const rows = await prisma.analyticsDaily.findMany({
    where: { day: { gte: previousStart, lt: end } },
  });
  return summarizeAnalytics(rows, days);
}
