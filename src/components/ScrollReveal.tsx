"use client";

import { motion, useMotionValue, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  variant?: "headline" | "block" | "row" | "rule";
  className?: string;
  once?: boolean;
  disabled?: boolean;
}

export function ScrollReveal({
  children,
  delay = 0,
  variant = "block",
  className = "",
  once = true,
  disabled = false,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const mode = useRef<"pending" | "entry" | "scroll" | "static">("pending");
  const complete = useRef(false);
  // The server stays readable; only offscreen content is enhanced after measurement.
  const progress = useMotionValue(1);
  const { scrollY, scrollYProgress } = useScroll({ target: ref, offset: ["start 94%", "start 62%"] });
  const x = useTransform(progress, [0, 1], [variant === "row" ? -24 : 0, 0]);
  const y = useTransform(progress, [0, 1], [variant === "headline" ? 34 : variant === "block" ? 18 : 0, 0]);
  const scaleX = useTransform(progress, [0, 1], [variant === "rule" ? 0 : 1, 1]);
  const clipPath = useTransform(progress, value => {
    const remaining = (1 - value) * 100;
    if (variant === "headline") return `inset(0 0 ${remaining}% 0)`;
    if (variant === "row") return `inset(0 ${remaining}% 0 0)`;
    return `inset(0 0 ${variant === "block" ? remaining * 0.18 : 0}% 0)`;
  });

  const show = () => {
    mode.current = "static";
    complete.current = true;
    if (ref.current) ref.current.dataset.revealMode = "static";
    progress.set(1);
  };

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (disabled || shouldReduceMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches || complete.current) {
      mode.current = "static";
      element.dataset.revealMode = "static";
      progress.set(1);
      return;
    }
    // Next restores the route's scroll position after child layout effects.
    // Measure on the next frame, ignoring stale scroll events until that reset settles.
    mode.current = "pending";
    const frame = requestAnimationFrame(() => {
      if (complete.current) {
        mode.current = "static";
        element.dataset.revealMode = "static";
        progress.set(1);
        return;
      }
      const top = element.getBoundingClientRect().top;
      mode.current = window.scrollY < 1 && top < window.innerHeight * 0.94 ? "entry" : "scroll";
      element.dataset.revealMode = mode.current;
      const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      const initial = atEnd ? 1 : Math.min(1, Math.max(0, (window.innerHeight * 0.94 - top) / (window.innerHeight * 0.32)));
      progress.set(mode.current === "entry" ? 1 : initial);
      if (mode.current === "scroll" && initial === 1 && once) complete.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, [disabled, once, progress, shouldReduceMotion]);

  useMotionValueEvent(scrollYProgress, "change", latest => {
    if (mode.current !== "scroll" || (once && complete.current)) return;
    const value = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2 ? 1 : latest;
    progress.set(value);
    if (once && value >= 1) complete.current = true;
  });
  useMotionValueEvent(scrollY, "change", latest => {
    // Scrolling takes priority over the first-screen entrance; never leave a timed queue behind.
    if (mode.current === "entry" && latest > 2 && window.scrollY > 2) show();
    if (mode.current === "scroll" && latest + window.innerHeight >= document.documentElement.scrollHeight - 2) {
      progress.set(1);
      if (once) complete.current = true;
    }
  });

  return (
    <div ref={ref} className={className} data-scroll-reveal={variant} data-reveal-mode={disabled ? "static" : undefined} onFocusCapture={show} style={{ "--reveal-delay": `${delay}s` } as CSSProperties}>
      <motion.div className="scroll-reveal-content" style={{ opacity: progress, x, y, scaleX, clipPath, transformOrigin: variant === "rule" ? "left center" : undefined }}>
        {children}
      </motion.div>
    </div>
  );
}
