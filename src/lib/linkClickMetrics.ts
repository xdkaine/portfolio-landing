import "server-only";
import { prisma } from "./prisma";
import { normalizeAnalyticsEvent } from "./analytics";
import { recordAnalytics } from "./analyticsStore";
const CLICK_KEY_PREFIX = "analytics_link::";
export interface StoredLinkClickMetric {
  destination: string;
  sourcePath: string;
  label: string;
  external: boolean;
  count: number;
  firstClickedAt: string;
  lastClickedAt: string;
}
export function parseStoredLinkClickMetric(
  raw: string,
): StoredLinkClickMetric | null {
  try {
    const parsed = JSON.parse(raw) as Partial<StoredLinkClickMetric>;
    if (
      typeof parsed.destination !== "string" ||
      typeof parsed.sourcePath !== "string" ||
      typeof parsed.label !== "string" ||
      typeof parsed.external !== "boolean" ||
      typeof parsed.count !== "number" ||
      typeof parsed.firstClickedAt !== "string" ||
      typeof parsed.lastClickedAt !== "string"
    ) {
      return null;
    }

    return {
      destination: parsed.destination,
      sourcePath: parsed.sourcePath,
      label: parsed.label,
      external: parsed.external,
      count: Number.isFinite(parsed.count) ? parsed.count : 0,
      firstClickedAt: parsed.firstClickedAt,
      lastClickedAt: parsed.lastClickedAt,
    };
  } catch {
    return null;
  }
}

export async function recordLinkClick(input: unknown): Promise<boolean> {
  if (!input || typeof input !== "object") return false;
  const event = normalizeAnalyticsEvent({ ...input, type: "click" });
  if (!event) return false;
  await recordAnalytics(event);
  return true;
}
export async function getLinkClickMetrics() {
  const settings = await prisma.siteSetting.findMany({
    where: { key: { startsWith: CLICK_KEY_PREFIX } },
    select: { key: true, value: true, updatedAt: true },
  });

  const items = settings
    .map((entry) => {
      const metric = parseStoredLinkClickMetric(entry.value);
      if (!metric) return null;

      return {
        key: entry.key,
        ...metric,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((a, b) => b.count - a.count);

  const totalClicks = items.reduce((sum, item) => sum + item.count, 0);
  const latestUpdatedAt =
    settings
      .map((entry) => entry.updatedAt)
      .sort((a, b) => b.getTime() - a.getTime())[0]
      ?.toISOString() ?? null;

  return {
    items,
    totalClicks,
    totalTrackedLinks: items.length,
    latestUpdatedAt,
  };
}
