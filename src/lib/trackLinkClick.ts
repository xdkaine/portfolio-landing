"use client";

export interface TrackLinkClickPayload {
  href: string;
  destination: string;
  sourcePath: string;
  label: string;
  external: boolean;
}

const TRACK_ENDPOINT = "/v1/api/analytics/link-click";

export function trackingAllowed(): boolean {
  return (
    typeof navigator !== "undefined" &&
    navigator.doNotTrack !== "1" &&
    !(navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl
  );
}

export function sendAnalytics(endpoint: string, payload: unknown): void {
  if (typeof window === "undefined" || !trackingAllowed()) return;
  const body = JSON.stringify(payload);
  try {
    if (
      typeof navigator.sendBeacon === "function" &&
      navigator.sendBeacon(
        endpoint,
        new Blob([body], { type: "application/json" }),
      )
    )
      return;
  } catch {
    /* Use keepalive if a beacon cannot be queued. */
  }
  void fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

export function trackLinkClick(payload: TrackLinkClickPayload): void {
  sendAnalytics(TRACK_ENDPOINT, payload);
}
