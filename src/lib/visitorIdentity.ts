import { createHmac } from "node:crypto";
import { isIP } from "node:net";
export const VISITOR_RETENTION_DAYS = 30;
export const DETAIL_DAILY_LIMIT = 20_000;
export interface VisitorSignals {
  language: string;
  timezone: string;
  screen: string;
  pixelRatio: number;
  touchPoints: number;
  hardwareConcurrency: number;
}
export interface VisitorContext {
  visitorToken: string;
  sessionToken: string;
  eventId: string;
  signals: VisitorSignals;
  activeMs: number;
  scrollDepth: number;
  loadMs: number;
  campaignSource: string;
  campaignMedium: string;
  campaignName: string;
}
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function boundedNumber(value: unknown, max: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.min(max, Math.round(value))
    : 0;
}
export function normalizeCampaign(value: unknown) {
  return typeof value === "string" && /^[\w .-]{1,80}$/.test(value.trim())
    ? value.trim()
    : "";
}
export function normalizeVisitorContext(input: unknown): VisitorContext | null {
  if (!input || typeof input !== "object") return null;
  const body = input as Record<string, unknown>;
  if (
    ![body.visitorToken, body.sessionToken, body.eventId].every(
      (value) => typeof value === "string" && UUID.test(value),
    )
  )
    return null;
  const raw =
    body.signals && typeof body.signals === "object"
      ? (body.signals as Record<string, unknown>)
      : {};
  const timezone =
    typeof raw.timezone === "string" &&
    raw.timezone.length <= 80 &&
    /^[A-Za-z0-9_+\-/]+$/.test(raw.timezone)
      ? raw.timezone
      : "";
  return {
    visitorToken: String(body.visitorToken),
    sessionToken: String(body.sessionToken),
    eventId: String(body.eventId),
    signals: {
      language:
        typeof raw.language === "string" &&
        /^[A-Za-z0-9-]{1,32}$/.test(raw.language)
          ? raw.language
          : "",
      timezone,
      screen:
        typeof raw.screen === "string" && /^\d{2,5}x\d{2,5}$/.test(raw.screen)
          ? raw.screen
          : "",
      pixelRatio:
        typeof raw.pixelRatio === "number" && Number.isFinite(raw.pixelRatio)
          ? Math.max(0, Math.min(8, Math.round(raw.pixelRatio * 4) / 4))
          : 0,
      touchPoints: boundedNumber(raw.touchPoints, 20),
      hardwareConcurrency: boundedNumber(raw.hardwareConcurrency, 128),
    },
    activeMs: boundedNumber(body.activeMs, 60_000),
    scrollDepth: boundedNumber(body.scrollDepth, 100),
    loadMs: boundedNumber(body.loadMs, 120_000),
    campaignSource: normalizeCampaign(body.campaignSource),
    campaignMedium: normalizeCampaign(body.campaignMedium),
    campaignName: normalizeCampaign(body.campaignName),
  };
}
export function visitorNetwork(headers: Headers, trustProxy: boolean) {
  const candidate = trustProxy ? (headers.get("x-real-ip")?.trim() ?? "") : "";
  const normalized =
    candidate.startsWith("::ffff:") && isIP(candidate.slice(7)) === 4
      ? candidate.slice(7)
      : candidate.toLowerCase();
  const ip = isIP(normalized) ? normalized : null;
  const country = trustProxy
    ? (headers.get("cf-ipcountry")?.toUpperCase() ?? "")
    : "";
  return {
    ip,
    ipSource: ip ? "trusted-proxy" : "unavailable",
    country: /^[A-Z]{2}$/.test(country) && country !== "XX" ? country : "",
  };
}
export function browserFamily(agent: string) {
  const browser = /Edg\//.test(agent)
    ? "Edge"
    : /OPR\//.test(agent)
      ? "Opera"
      : /Firefox\//.test(agent)
        ? "Firefox"
        : /Chrome\//.test(agent)
          ? "Chrome"
          : /Safari\//.test(agent)
            ? "Safari"
            : "Other";
  const os = /iPhone|iPad/.test(agent)
    ? "iOS"
    : /Android/.test(agent)
      ? "Android"
      : /Windows/.test(agent)
        ? "Windows"
        : /Macintosh|Mac OS/.test(agent)
          ? "macOS"
          : /Linux/.test(agent)
            ? "Linux"
            : "Other";
  return { browser, os };
}
export function visitorKeys(
  context: VisitorContext,
  userAgent: string,
  secret: string,
) {
  if (secret.length < 32)
    throw new Error("Analytics hashing requires a configured server secret");
  const hash = (value: unknown) =>
    createHmac("sha256", secret).update(JSON.stringify(value)).digest("hex");
  const visitorId = hash(["visitor-v1", context.visitorToken]);
  return {
    visitorId,
    sessionId: hash(["session-v1", visitorId, context.sessionToken]),
    eventId: hash([
      "event-v1",
      visitorId,
      context.sessionToken,
      context.eventId,
    ]),
    fingerprint: hash(["browser-similarity-v1", userAgent, context.signals]),
  };
}
