"use client";

import { motion, useMotionValue, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  // Reserve rule for standalone lines; text-bearing rows keep their natural proportions.
  variant?: "headline" | "block" | "row" | "rule" | "media";
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
  const { scrollY, scrollYProgress } = useScroll({ target: ref, offset: ["start 98%", "start 45%"] });
  const x = useTransform(progress, [0, 1], [variant === "row" ? -56 : 0, 0]);
  const y = useTransform(progress, [0, 1], [variant === "headline" ? 64 : variant === "block" ? 56 : variant === "media" ? 72 : 0, 0]);
  const scale = useTransform(progress, [0, 1], [variant === "media" ? 0.94 : 1, 1]);
  const scaleX = useTransform(progress, [0, 1], [variant === "rule" ? 0 : 1, 1]);
  const clipPath = useTransform(progress, value => {
    const remaining = (1 - value) * 100;
    if (variant === "headline") return `inset(0 0 ${remaining}% 0)`;
    if (variant === "row") return `inset(0 ${remaining}% 0 0)`;
    return `inset(0 0 ${variant === "block" ? remaining * 0.36 : variant === "media" ? remaining * 0.32 : 0}% 0)`;
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
      mode.current = window.scrollY < 1 && top < window.innerHeight * 0.85 ? "entry" : "scroll";
      element.dataset.revealMode = mode.current;
      const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      const initial = atEnd ? 1 : Math.min(1, Math.max(0, (window.innerHeight * 0.98 - top) / (window.innerHeight * 0.53)));
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
    <div ref={ref} className={className} data-scroll-reveal={variant} data-reveal-mode={disabled ? "static" : undefined} onFocusCapture={show} style={{ "--reveal-delay": `${Math.min(0.18, Math.max(0, delay))}s` } as CSSProperties}>
      <motion.div className="scroll-reveal-content" style={{ opacity: progress, x, y, scale, scaleX, clipPath, transformOrigin: variant === "rule" ? "var(--entry-origin, left center)" : undefined }}>
        {children}
      </motion.div>
    </div>
  );
}
