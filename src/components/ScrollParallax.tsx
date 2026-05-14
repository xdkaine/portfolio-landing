"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

/**
 * ScrollParallax — elements that translate at a different rate than scroll.
 *
 * `speed` controls the parallax factor:
 *   - speed > 0: moves slower than scroll (lags behind)
 *   - speed < 0: moves faster / opposite direction
 *   - speed = 0: no parallax (normal scroll)
 *
 * Optionally applies scale and opacity transforms tied to scroll.
 */

interface ScrollParallaxProps {
  children: ReactNode;
  /** Parallax speed factor. Positive = slower, negative = opposite. Default 0.3 */
  speed?: number;
  /** Scale range [start, end] mapped to scroll progress. E.g. [1, 0.8] */
  scaleRange?: [number, number];
  /** Opacity range [start, end] mapped to scroll progress */
  opacityRange?: [number, number];
  /** Rotation range in degrees [start, end] mapped to scroll progress */
  rotateRange?: [number, number];
  className?: string;
}

export function ScrollParallax({
  children,
  speed = 0.3,
  scaleRange,
  opacityRange,
  rotateRange,
  className = "",
}: ScrollParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Y offset: map 0→1 scroll progress to pixel offset based on speed
  const y = useTransform(scrollYProgress, [0, 1], [speed * 150, speed * -150]);

  // Always call hooks (rules of hooks), use identity ranges as defaults
  const scale = useTransform(
    scrollYProgress,
    [0, 1],
    scaleRange ?? [1, 1]
  );

  const opacity = useTransform(
    scrollYProgress,
    [0, 1],
    opacityRange ?? [1, 1]
  );

  const rotate = useTransform(
    scrollYProgress,
    [0, 1],
    rotateRange ?? [0, 0]
  );

  return (
    <motion.div
      ref={ref}
      className={className}
      style={shouldReduceMotion ? undefined : { y, scale, opacity, rotate }}
    >
      {children}
    </motion.div>
  );
}

/**
 * ScrollZoom — element that scales based on scroll position.
 * Commonly used for hero images / text that grow or shrink on scroll.
 */
interface ScrollZoomProps {
  children: ReactNode;
  /** Scale at the top of scroll range */
  from?: number;
  /** Scale at the bottom of scroll range */
  to?: number;
  className?: string;
}

export function ScrollZoom({
  children,
  from = 1,
  to = 0.6,
  className = "",
}: ScrollZoomProps) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [from, to]);
  const opacity = useTransform(scrollYProgress, [0, 0.8, 1], [1, 1, 0]);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={shouldReduceMotion ? undefined : { scale, opacity }}
    >
      {children}
    </motion.div>
  );
}
