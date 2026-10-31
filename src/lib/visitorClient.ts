"use client";
const VISITOR_KEY = "phao.analytics.visitor.v1";
const SESSION_KEY = "phao.analytics.session.v1";
export const ANALYTICS_PREFERENCE_KEY = "phao.analytics.preference";
let memoryOptOut: boolean | undefined;
let preferenceWriteFailed = false;
let memoryVisitor: { token: string; expires: number } | null = null;
let memorySession: { token: string; lastSeen: number; sequence?: number } | null = null;
export function analyticsOptedOut() {
  if (preferenceWriteFailed) return memoryOptOut ?? false;
  try {
    return localStorage.getItem(ANALYTICS_PREFERENCE_KEY) === "off";
  } catch {
    return memoryOptOut ?? false;
  }
}
export function clientVisitorContext() {
  const now = Date.now();
  try {
    const stored = JSON.parse(localStorage.getItem(VISITOR_KEY) ?? "null");
    if (stored?.expires > now && typeof stored.token === "string")
      memoryVisitor = stored;
  } catch {
    /* Storage may be unavailable. Use in-memory identifiers. */
  }
  if (!memoryVisitor || memoryVisitor.expires <= now)
    memoryVisitor = {
      token: crypto.randomUUID(),
      expires: now + 30 * 86_400_000,
    };
  try {
    localStorage.setItem(VISITOR_KEY, JSON.stringify(memoryVisitor));
  } catch {
    /* This tab still works without persistent storage. */
  }
  try {
    const stored = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null");
    if (
      stored?.lastSeen > now - 30 * 60_000 &&
      typeof stored.token === "string"
    )
      memorySession = stored;
  } catch {
    /* Use the in-memory session. */
  }
  if (!memorySession || memorySession.lastSeen <= now - 30 * 60_000)
    memorySession = { token: crypto.randomUUID(), lastSeen: now };
  memorySession.lastSeen = now;
  memorySession.sequence = Math.min(2_000_000_000, Math.max(0, Number(memorySession.sequence) || 0) + 1);
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(memorySession));
  } catch {
    /* Storage can be blocked. */
  }
  return {
    visitorToken: memoryVisitor.token,
    sessionToken: memorySession.token,
    eventId: crypto.randomUUID(),
    occurredAt: now,
    clientSequence: memorySession.sequence,
    signals: {
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: `${screen.width}x${screen.height}`,
      pixelRatio: window.devicePixelRatio,
      touchPoints: navigator.maxTouchPoints,
      hardwareConcurrency: navigator.hardwareConcurrency,
    },
  };
}
export function visitorCampaign() {
  const params = new URLSearchParams(window.location.search);
  const safe = (key: string) => {
    const value = params.get(key) ?? "";
    return /^[\w .-]{1,80}$/.test(value) ? value : "";
  };
  return {
    campaignSource: safe("utm_source"),
    campaignMedium: safe("utm_medium"),
    campaignName: safe("utm_campaign"),
  };
}
export function resetClientVisitor() {
  memoryVisitor = null;
  memorySession = null;
  try {
    localStorage.removeItem(VISITOR_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* Storage may be blocked. */
  }
}

export function setAnalyticsOptOut(value: boolean) {
  memoryOptOut = value;
  try {
    localStorage.setItem(ANALYTICS_PREFERENCE_KEY, value ? "off" : "on");
    preferenceWriteFailed = false;
  } catch {
    preferenceWriteFailed = true;
    /* Keep the choice in memory if storage is blocked. */
  }
  if (value) resetClientVisitor();
  window.dispatchEvent(new Event("phao-analytics-preference"));
}
