"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { observeViewport, viewportProgress } from "@/lib/viewportProgress";

// Enhance existing document blocks in place: their widths, margins, heading
// anchors, tables and media layouts remain the server-rendered document's own.
export function ScrollRevealGroup({ children, className }: { children: ReactNode; className: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    const container = ref.current;
    if (!container || reduced || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const blocks = Array.from(container.children) as HTMLElement[];
    blocks.forEach(element => {
      element.dataset.storyReveal = /^H[1-6]$/.test(element.tagName) ? "headline"
        : element.tagName === "HR" ? "rule"
        : element.matches("figure, .story-split, .story-carousel") ? "media" : "block";
    });
    const stop = observeViewport(viewport => {
      blocks.forEach(element => {
        const value = String(viewportProgress(element.getBoundingClientRect().top, viewport, 0.98, 0.45, true));
        if (element.style.getPropertyValue("--story-reveal-progress") !== value) element.style.setProperty("--story-reveal-progress", value);
      });
    });
    return () => {
      stop();
      blocks.forEach(element => {
        delete element.dataset.storyReveal;
        element.style.removeProperty("--story-reveal-progress");
      });
    };
  }, [children, reduced]);
  return <div ref={ref} className={className}>{children}</div>;
}
