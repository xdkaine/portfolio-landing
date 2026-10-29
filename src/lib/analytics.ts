export type AnalyticsType = "pageview" | "click" | "contact" | "engagement";
export interface AnalyticsEvent {
  type: AnalyticsType;
  path: string;
  destination: string;
  label: string;
  referrer: string;
  device: string;
}
export interface AnalyticsRow extends Omit<AnalyticsEvent, "type"> {
  type: string;
  day: Date;
  count: number;
}
const DAY = 86_400_000;

export function publicAnalyticsPath(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.length > 2048 ||
    /[\\\x00-\x1f]/.test(value)
  )
    return null;
  try {
    const path =
      decodeURIComponent(
        new URL(value, "https://local.invalid").pathname,
      ).replace(/\/+$/, "") || "/";
    if (
      path !== "/v1" &&
      !/^\/v1\/(blog|projects|about|contact|privacy|terms)(\/|$)/.test(path)
    )
      return null;
    if (path.length > 300 || /[?#\\\x00-\x1f]/.test(path)) return null;
    return path;
  } catch {
    return null;
  }
}

export function normalizeAnalyticsEvent(input: unknown): AnalyticsEvent | null {
  if (!input || typeof input !== "object") return null;
  const body = input as Record<string, unknown>;
  if (
    body.type !== "pageview" &&
    body.type !== "click" &&
    body.type !== "engagement"
  )
    return null;
  const path = publicAnalyticsPath(body.path ?? body.sourcePath);
  if (!path) return null;
  let destination = "";
  if (body.type === "click") {
    if (
      typeof body.destination !== "string" ||
      body.destination.length > 2048 ||
      /[\\\x00-\x1f]/.test(body.destination)
    )
      return null;
    if (/^(mailto|tel):/i.test(body.destination))
      destination = body.destination.split(":")[0].toLowerCase() + ":";
    else {
      try {
        const url = new URL(body.destination, "https://local.invalid");
        if (
          !["http:", "https:"].includes(url.protocol) ||
          url.username ||
          url.password
        )
          return null;
        destination =
          body.destination.startsWith("/") && !body.destination.startsWith("//")
            ? url.pathname
            : url.origin + url.pathname;
        if (destination.length > 500) return null;
        if (destination.startsWith("/v1/") && !publicAnalyticsPath(destination))
          return null;
      } catch {
        return null;
      }
    }
  }
  let referrer = "Direct";
  if (
    body.type === "pageview" &&
    typeof body.referrer === "string" &&
    body.referrer
  ) {
    try {
      const url = new URL(body.referrer);
      if (["http:", "https:"].includes(url.protocol))
        referrer = url.hostname.toLowerCase().slice(0, 253);
    } catch {
      /* Invalid referrers are direct. */
    }
  }
  return {
    type: body.type,
    path,
    destination,
    label:
      body.type === "click" && typeof body.label === "string"
        ? body.label.replace(/\s+/g, " ").trim().slice(0, 100)
        : "",
    referrer: body.type === "pageview" ? referrer : "",
    device:
      body.type === "pageview" &&
      ["desktop", "mobile", "tablet"].includes(String(body.device))
        ? String(body.device)
        : "other",
  };
}

export function analyticsWindow(days: number, now = new Date()) {
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) + DAY,
  );
  const start = new Date(end.getTime() - days * DAY);
  return { start, end, previousStart: new Date(start.getTime() - days * DAY) };
}

export function summarizeAnalytics(
  rows: AnalyticsRow[],
  days: number,
  now = new Date(),
) {
  const { start, end, previousStart } = analyticsWindow(days, now);
  const totals = { pageviews: 0, clicks: 0, contacts: 0 };
  const previous = { ...totals };
  const trend = Array.from({ length: days }, (_, i) => ({
    day: new Date(start.getTime() + i * DAY).toISOString().slice(0, 10),
    ...totals,
  }));
  const groups = {
    pages: new Map<string, number>(),
    links: new Map<string, number>(),
    referrers: new Map<string, number>(),
    devices: new Map<string, number>(),
  };
  for (const row of rows) {
    const time = row.day.getTime();
    if (time < previousStart.getTime() || time >= end.getTime()) continue;
    const field =
      row.type === "pageview"
        ? "pageviews"
        : row.type === "click"
          ? "clicks"
          : row.type === "contact"
            ? "contacts"
            : null;
    if (!field) continue;
    if (time < start.getTime()) {
      previous[field] += row.count;
      continue;
    }
    totals[field] += row.count;
    const point = trend[Math.floor((time - start.getTime()) / DAY)];
    if (point) point[field] += row.count;
    const increment = (group: Map<string, number>, key: string) =>
      group.set(key, (group.get(key) ?? 0) + row.count);
    if (row.type === "pageview") {
      increment(groups.pages, row.path);
      increment(groups.referrers, row.referrer);
      increment(groups.devices, row.device);
    }
    if (row.type === "click") increment(groups.links, row.destination);
  }
  const ranked = (group: Map<string, number>) =>
    Array.from(group, ([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 20);
  return {
    days,
    start: start.toISOString(),
    end: end.toISOString(),
    generatedAt: now.toISOString(),
    totals,
    previous,
    trend,
    pages: ranked(groups.pages),
    links: ranked(groups.links),
    referrers: ranked(groups.referrers),
    devices: ranked(groups.devices),
  };
}
export type AnalyticsReport = ReturnType<typeof summarizeAnalytics>;
