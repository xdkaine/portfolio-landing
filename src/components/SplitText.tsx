"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
}

export function SplitText({
  text,
  className = "",
  delay = 0,
  stagger = 0.05,
}: SplitTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const shouldReduceMotion = useReducedMotion();

  return (
    <span ref={ref} className={`inline-block ${className}`}>
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          initial={shouldReduceMotion ? false : { opacity: 0, y: 80, rotateX: -40 }}
          animate={
            shouldReduceMotion
              ? undefined
              : isInView
                ? { opacity: 1, y: 0, rotateX: 0 }
                : {}
          }
          transition={{
            duration: shouldReduceMotion ? 0 : 0.6,
            delay: delay + i * stagger,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          style={{
            display: "inline-block",
            transformOrigin: "bottom",
          }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </span>
  );
}
