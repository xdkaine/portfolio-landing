"use client";

import { motion, useTransform } from "motion/react";
import { useViewportProgress } from "@/lib/useViewportProgress";
import { useRef, type CSSProperties, type ReactNode } from "react";

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
  once = false,
  disabled = false,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const progress = useViewportProgress(ref, 0.98, 0.45, { entrance: true, once, disabled, completeAtEnd: true });
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

  return (
    <div ref={ref} className={className} data-scroll-reveal={variant} data-reveal-mode={disabled ? "static" : undefined} style={{ "--reveal-delay": `${Math.min(0.18, Math.max(0, delay))}s` } as CSSProperties}>
      <motion.div className="scroll-reveal-content" style={{ opacity: progress, x, y, scale, scaleX, clipPath, transformOrigin: variant === "rule" ? "var(--entry-origin, left center)" : undefined }}>
        {children}
      </motion.div>
    </div>
  );
}
