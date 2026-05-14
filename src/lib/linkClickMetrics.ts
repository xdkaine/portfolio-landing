import "server-only";

import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

const CLICK_KEY_PREFIX = "analytics_link::";
const MAX_DESTINATION_LENGTH = 2048;
const MAX_LABEL_LENGTH = 140;
const MAX_SOURCE_PATH_LENGTH = 300;

interface LinkClickPayload {
  href: string;
  destination: string;
  sourcePath: string;
  label: string;
  external: boolean;
}

export interface StoredLinkClickMetric {
  destination: string;
  sourcePath: string;
  label: string;
  external: boolean;
  count: number;
  firstClickedAt: string;
  lastClickedAt: string;
}

function sanitizePath(value: unknown): string {
  if (typeof value !== "string") return "/";
  const trimmed = value.trim().slice(0, MAX_SOURCE_PATH_LENGTH);
  return trimmed || "/";
}

function sanitizeDestination(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_DESTINATION_LENGTH);
}

function sanitizeLabel(value: unknown): string {
  if (typeof value !== "string") return "LINK";
  const normalized = value.replace(/\s+/g, " ").trim().slice(0, MAX_LABEL_LENGTH);
  return normalized || "LINK";
}

function createMetricKey(payload: LinkClickPayload): string {
  const signature = `${payload.destination}|${payload.sourcePath}|${payload.label}`;
  const hash = createHash("sha256").update(signature).digest("hex").slice(0, 24);
  return `${CLICK_KEY_PREFIX}${hash}`;
}

export function parseStoredLinkClickMetric(raw: string): StoredLinkClickMetric | null {
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

function buildPayload(input: unknown): LinkClickPayload | null {
  if (!input || typeof input !== "object") return null;
  const body = input as Record<string, unknown>;

  const href = sanitizeDestination(body.href);
  const destination = sanitizeDestination(body.destination);
  const sourcePath = sanitizePath(body.sourcePath);
  const label = sanitizeLabel(body.label);
  const external = body.external === true;

  if (!href || !destination) return null;
  if (!sourcePath.startsWith("/")) return null;
  if (sourcePath.startsWith("/admin") || sourcePath.startsWith("/api")) return null;

  return { href, destination, sourcePath, label, external };
}

export async function recordLinkClick(input: unknown): Promise<boolean> {
  const payload = buildPayload(input);
  if (!payload) {
    return false;
  }

  const now = new Date().toISOString();
  const key = createMetricKey(payload);
  const existing = await prisma.siteSetting.findUnique({
    where: { key },
    select: { value: true },
  });
  const parsedExisting = existing?.value
    ? parseStoredLinkClickMetric(existing.value)
    : null;

  const nextMetric: StoredLinkClickMetric = {
    destination: payload.destination,
    sourcePath: payload.sourcePath,
    label: payload.label,
    external: payload.external,
    count: (parsedExisting?.count ?? 0) + 1,
    firstClickedAt: parsedExisting?.firstClickedAt ?? now,
    lastClickedAt: now,
  };

  await prisma.siteSetting.upsert({
    where: { key },
    update: { value: JSON.stringify(nextMetric) },
    create: { key, value: JSON.stringify(nextMetric) },
  });

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
