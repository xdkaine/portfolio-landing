"use client";

export interface TrackLinkClickPayload {
  href: string;
  destination: string;
  sourcePath: string;
  label: string;
  external: boolean;
}

const TRACK_ENDPOINT = "/api/analytics/link-click";

export function trackLinkClick(payload: TrackLinkClickPayload): void {
  if (typeof window === "undefined") return;

  const body = JSON.stringify(payload);

  try {
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(TRACK_ENDPOINT, blob);
      return;
    }
  } catch {
    // Fall through to fetch keepalive.
  }

  fetch(TRACK_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Avoid surfacing tracking errors to UI.
  });
}

