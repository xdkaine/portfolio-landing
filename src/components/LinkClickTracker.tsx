"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackLinkClick, sendAnalytics } from "@/lib/trackLinkClick";
import { publicAnalyticsPath } from "@/lib/analytics";
const labelFor = (anchor: HTMLAnchorElement) =>
  (
    anchor.dataset.analyticsLabel ||
    anchor.getAttribute("aria-label") ||
    anchor.textContent ||
    "Link"
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
function destinationFor(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href")?.trim();
  if (!href || href.startsWith("#")) return null;
  if (/^(mailto|tel):/i.test(href))
    return {
      destination: href.split(":")[0].toLowerCase() + ":",
      external: true,
    };
  try {
    const url = new URL(anchor.href, window.location.origin);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    const external = url.origin !== window.location.origin;
    return {
      destination: external ? url.origin + url.pathname : url.pathname,
      external,
    };
  } catch {
    return null;
  }
}
type PageState = {
  path: string;
  eventId: string;
  sent: boolean;
  activeMs: number;
  lastTick: number;
  visible: boolean;
  scrollDepth: number;
  sentDepth: number;
  loadRecorded: boolean;
};
export function LinkClickTracker() {
  const pathname = usePathname();
  const current = useRef<PageState | null>(null);
  const previous = useRef<string | null>(null);
  const navigationMeasured = useRef(false);
  useEffect(() => {
    const path = publicAnalyticsPath(pathname);
    if (!path) {
      previous.current = null;
      current.current = null;
      return;
    }
    if (current.current?.path !== path)
      current.current = {
        path,
        eventId: crypto.randomUUID(),
        sent: false,
        activeMs: 0,
        lastTick: performance.now(),
        visible: document.visibilityState === "visible",
        scrollDepth: 0,
        sentDepth: 0,
        loadRecorded: false,
      };
    const page = current.current;
    const loadTime = () => {
      if (navigationMeasured.current) return 0;
      const navigation = performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;
      if (
        !navigation ||
        publicAnalyticsPath(new URL(navigation.name).pathname) !== path
      )
        return 0;
      return Math.round(navigation.domContentLoadedEventEnd || 0);
    };
    const measure = () => {
      const now = performance.now();
      if (page.visible)
        page.activeMs += Math.min(60_000, Math.max(0, now - page.lastTick));
      page.lastTick = now;
      page.visible = document.visibilityState === "visible";
      page.scrollDepth = Math.max(
        page.scrollDepth,
        Math.min(
          100,
          Math.round(
            ((window.scrollY + window.innerHeight) /
              Math.max(1, document.documentElement.scrollHeight)) *
              100,
          ),
        ),
      );
    };
    const flush = () => {
      measure();
      const loadMs = page.loadRecorded ? 0 : loadTime();
      if (page.activeMs < 1000 && page.scrollDepth <= page.sentDepth && !loadMs)
        return;
      sendAnalytics("/v1/api/analytics/events", {
        type: "engagement",
        path,
        activeMs: Math.round(page.activeMs),
        scrollDepth: page.scrollDepth,
        loadMs,
      });
      page.activeMs = 0;
      page.sentDepth = page.scrollDepth;
      if (loadMs) {
        page.loadRecorded = true;
        navigationMeasured.current = true;
      }
    };
    if (!page.sent) {
      let source = "";
      try {
        source = previous.current
          ? window.location.origin
          : new URL(document.referrer).origin;
      } catch {
        /* Direct visit. */
      }
      const loadMs = loadTime();
      sendAnalytics("/v1/api/analytics/events", {
        type: "pageview",
        eventId: page.eventId,
        path,
        referrer: source,
        loadMs,
        device: /iPad|Tablet/i.test(navigator.userAgent)
          ? "tablet"
          : /Mobi/i.test(navigator.userAgent)
            ? "mobile"
            : "desktop",
      });
      page.sent = true;
      page.loadRecorded = loadMs > 0;
      if (loadMs) navigationMeasured.current = true;
    }
    previous.current = path;
    const visibility = () => {
      if (document.visibilityState === "hidden") flush();
      else {
        page.lastTick = performance.now();
        page.visible = true;
      }
    };
    const timer = window.setInterval(flush, 30_000);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", flush);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("scroll", measure);
      flush();
    };
  }, [pathname]);
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.button !== 0 && event.button !== 1) return;
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest("a[href]");
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.dataset.analytics === "off"
      )
        return;
      const path = publicAnalyticsPath(window.location.pathname);
      const link = destinationFor(anchor);
      if (!path || !link) return;
      trackLinkClick({
        href: link.destination,
        destination: link.destination,
        sourcePath: path,
        label: /^(mailto|tel):/.test(link.destination)
          ? "Contact link"
          : labelFor(anchor),
        external: link.external,
      });
    };
    document.addEventListener("click", handleClick, { capture: true });
    document.addEventListener("auxclick", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
      document.removeEventListener("auxclick", handleClick, { capture: true });
    };
  }, []);
  return null;
}
