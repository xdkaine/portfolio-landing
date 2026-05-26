"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef, type ReactNode } from "react";
import { useJourneyTransitionActive } from "@/components/JourneyTransition";

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  className?: string;
  once?: boolean;
  suppressMotion?: boolean;
}

const offsets = {
  up: { y: 50 },
  down: { y: -50 },
  left: { x: 50 },
  right: { x: -50 },
};

export function ScrollReveal({
  children,
  delay = 0,
  direction = "up",
  className = "",
  once = false,
  suppressMotion = false,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: "-80px" });
  const shouldReduceMotion = useReducedMotion();
  const shouldSuppressMotion = Boolean(shouldReduceMotion) || suppressMotion;
  const hidden = shouldSuppressMotion ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, ...offsets[direction] };
  const visible = { opacity: 1, x: 0, y: 0 };

  return (
    <motion.div
      ref={ref}
      initial={hidden}
      animate={isInView ? visible : hidden}
      transition={{
        duration: shouldSuppressMotion ? 0 : 0.7,
        delay: isInView ? delay : 0,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function JourneyAwareScrollReveal(props: ScrollRevealProps) {
  const journeyActive = useJourneyTransitionActive();

  return <ScrollReveal {...props} suppressMotion={journeyActive} />;
}
