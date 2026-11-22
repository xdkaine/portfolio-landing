"use client";

import { useMotionValue } from "motion/react";
import { useLayoutEffect, useRef, type RefObject } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { observeViewport, viewportProgress } from "@/lib/viewportProgress";

export function useViewportProgress(ref: RefObject<HTMLElement | null>, start: number, end: number, {
  entrance = false,
  once = false,
  disabled = false,
  completeAtEnd = false,
}: { entrance?: boolean; once?: boolean; disabled?: boolean; completeAtEnd?: boolean } = {}) {
  // SSR and no-JS output stay readable. Enhance after route scroll restoration.
  const progress = useMotionValue(1);
  const reduced = useReducedMotion();
  const complete = useRef(false);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const setMode = (mode: string) => {
      if (entrance && element.dataset.revealMode !== mode) element.dataset.revealMode = mode;
    };
    if (!once) complete.current = false;
    if (disabled || reduced || window.matchMedia("(prefers-reduced-motion: reduce)").matches || (once && complete.current)) {
      setMode("static");
      progress.set(1);
      return;
    }
    let initial = true;
    let entering = false;
    return observeViewport(viewport => {
      if (once && complete.current) return;
      const top = element.getBoundingClientRect().top;
      if (initial) {
        entering = entrance && viewport.scrollTop < 1 && top < viewport.height * 0.85;
        initial = false;
      }
      if (entering && viewport.scrollTop > 2) entering = false;
      setMode(entering ? "entry" : "scroll");
      const value = entering ? 1 : viewportProgress(top, viewport, start, end, completeAtEnd);
      progress.set(value);
      if (once && value >= 1) complete.current = true;
    });
  }, [completeAtEnd, disabled, end, entrance, once, progress, reduced, ref, start]);
  return progress;
}
