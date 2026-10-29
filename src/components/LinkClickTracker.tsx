"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackLinkClick, sendAnalytics } from "@/lib/trackLinkClick";
import { publicAnalyticsPath } from "@/lib/analytics";

const MAX_LABEL_LENGTH = 140;

function sanitizeLabel(anchor: HTMLAnchorElement): string {
  const explicit = anchor.dataset.analyticsLabel?.trim();
  if (explicit) return explicit.slice(0, MAX_LABEL_LENGTH);

  const aria = anchor.getAttribute("aria-label")?.trim();
  if (aria) return aria.slice(0, MAX_LABEL_LENGTH);

  const text = anchor.textContent?.replace(/\s+/g, " ").trim() ?? "";
  if (text) return text.slice(0, MAX_LABEL_LENGTH);

  return "LINK";
}

function normalizeDestination(anchor: HTMLAnchorElement): {
  destination: string;
  external: boolean;
} | null {
  const rawHref = anchor.getAttribute("href");
  if (!rawHref) return null;

  const trimmedHref = rawHref.trim();
  if (!trimmedHref || trimmedHref.startsWith("#")) return null;
  if (trimmedHref.startsWith("javascript:")) return null;

  if (trimmedHref.startsWith("mailto:") || trimmedHref.startsWith("tel:")) {
    return { destination: trimmedHref.split(":")[0] + ":", external: true };
  }

  try {
    const absolute = new URL(anchor.href, window.location.origin);
    const external = absolute.origin !== window.location.origin;
    const destination = external
      ? `${absolute.origin}${absolute.pathname}`
      : absolute.pathname || "/";

    return { destination, external };
  } catch {
    return null;
  }
}

export function LinkClickTracker() {
  const pathname = usePathname();
  const previousPath = useRef<string | null>(null);
  useEffect(() => {
    const path = publicAnalyticsPath(pathname);
    if (!path) {
      previousPath.current = null;
      return;
    }
    if (path === previousPath.current) return;
    const referrer = previousPath.current ? "Internal" : document.referrer;
    previousPath.current = path;
    // Hostname only; no referrer query, credentials or path leaves this browser.
    let source = "";
    try {
      source =
        referrer === "Internal"
          ? window.location.origin
          : new URL(referrer).origin;
    } catch {
      /* Direct visit. */
    }
    sendAnalytics("/v1/api/analytics/events", {
      type: "pageview",
      path,
      referrer: source,
      device: /iPad|Tablet/i.test(navigator.userAgent)
        ? "tablet"
        : /Mobi/i.test(navigator.userAgent)
          ? "mobile"
          : "desktop",
    });
  }, [pathname]);
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;

      const rawHref = anchor.getAttribute("href");
      if (!rawHref) return;

      const sourcePath = publicAnalyticsPath(window.location.pathname);
      if (!sourcePath || anchor.dataset.analytics === "off") return;

      const normalized = normalizeDestination(anchor);
      if (!normalized) return;

      trackLinkClick({
        href: normalized.destination,
        destination: normalized.destination,
        sourcePath,
        label: /^(mailto|tel):/.test(normalized.destination)
          ? normalized.destination === "mailto:"
            ? "Email contact"
            : "Phone contact"
          : sanitizeLabel(anchor),
        external: normalized.external,
      });
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, []);

  return null;
}
