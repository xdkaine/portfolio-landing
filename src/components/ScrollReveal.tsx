"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  variant?: "headline" | "block" | "row" | "rule";
  className?: string;
  once?: boolean;
}

const hiddenStates = {
  headline: {
    opacity: 0,
    y: 34,
    clipPath: "inset(0 0 100% 0)",
  },
  block: {
    opacity: 0,
    y: 18,
    clipPath: "inset(0 0 18% 0)",
  },
  row: {
    opacity: 0,
    x: -24,
    clipPath: "inset(0 100% 0 0)",
  },
  rule: {
    opacity: 0,
    scaleX: 0,
    transformOrigin: "left center",
  },
};

export function ScrollReveal({
  children,
  delay = 0,
  variant = "block",
  className = "",
  once = true,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: "0px 0px -12% 0px" });
  const shouldReduceMotion = useReducedMotion();
  const hidden = shouldReduceMotion ? false : hiddenStates[variant];
  const visible = {
    opacity: 1,
    x: 0,
    y: 0,
    scaleX: 1,
    clipPath: "inset(0 0 0% 0)",
  };

  return (
    <motion.div
      ref={ref}
      initial={hidden}
      animate={shouldReduceMotion || isInView ? visible : hiddenStates[variant]}
      transition={{
        duration: shouldReduceMotion ? 0 : variant === "headline" ? 0.72 : 0.56,
        delay: isInView ? delay : 0,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
