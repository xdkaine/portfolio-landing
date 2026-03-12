"use client";

import { useEffect } from "react";
import { trackLinkClick } from "@/lib/trackLinkClick";

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
    return { destination: trimmedHref, external: true };
  }

  try {
    const absolute = new URL(anchor.href, window.location.origin);
    const external = absolute.origin !== window.location.origin;
    const destination = external
      ? `${absolute.origin}${absolute.pathname}${absolute.search}`
      : `${absolute.pathname}${absolute.search}` || "/";

    return { destination, external };
  } catch {
    return null;
  }
}

export function LinkClickTracker() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;

      const rawHref = anchor.getAttribute("href");
      if (!rawHref) return;

      const sourcePath = `${window.location.pathname}${window.location.search}`;
      if (sourcePath.startsWith("/admin") || sourcePath.startsWith("/api")) return;

      const normalized = normalizeDestination(anchor);
      if (!normalized) return;

      trackLinkClick({
        href: rawHref,
        destination: normalized.destination,
        sourcePath,
        label: sanitizeLabel(anchor),
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

