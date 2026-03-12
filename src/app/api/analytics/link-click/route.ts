import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { checkRateLimit, getRequestIp } from "@/lib/rateLimit";

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

interface StoredLinkClickMetric {
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

function sanitizeExternal(value: unknown): boolean {
  return value === true;
}

function createMetricKey(payload: LinkClickPayload): string {
  const signature = `${payload.destination}|${payload.sourcePath}|${payload.label}`;
  const hash = createHash("sha256").update(signature).digest("hex").slice(0, 24);
  return `${CLICK_KEY_PREFIX}${hash}`;
}

function parseStoredMetric(raw: string): StoredLinkClickMetric | null {
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
  const external = sanitizeExternal(body.external);

  if (!href || !destination) return null;
  if (!sourcePath.startsWith("/")) return null;
  if (sourcePath.startsWith("/admin") || sourcePath.startsWith("/api")) return null;

  return { href, destination, sourcePath, label, external };
}

export async function POST(request: Request) {
  try {
    const ip = getRequestIp(request);
    const rateLimit = checkRateLimit(`link-click:${ip}`, 400, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    const payload = buildPayload(await request.json());
    if (!payload) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const key = createMetricKey(payload);
    const existing = await prisma.siteSetting.findUnique({
      where: { key },
      select: { value: true },
    });
    const parsedExisting = existing?.value
      ? parseStoredMetric(existing.value)
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

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to track click" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await prisma.siteSetting.findMany({
      where: { key: { startsWith: CLICK_KEY_PREFIX } },
      select: { key: true, value: true, updatedAt: true },
    });

    const items = settings
      .map((entry) => {
        const metric = parseStoredMetric(entry.value);
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

    return NextResponse.json({
      items,
      totalClicks,
      totalTrackedLinks: items.length,
      latestUpdatedAt,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch link click metrics" },
      { status: 500 },
    );
  }
}

