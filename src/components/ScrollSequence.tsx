"use client";

import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useRef, createContext, useContext, type ReactNode } from "react";

/**
 * ScrollSequence — Apple-style pinned scroll section.
 *
 * Creates a tall scroll region (height = pages × 100vh) with a sticky viewport.
 * Children receive the section's scroll progress (0→1) through context
 * and can use <SequenceItem> to control their own entrance/exit windows.
 *
 * Usage:
 *   <ScrollSequence pages={4}>
 *     <SequenceItem start={0} end={0.3}>
 *       <h2>First thing</h2>
 *     </SequenceItem>
 *     <SequenceItem start={0.3} end={0.6}>
 *       <h2>Second thing</h2>
 *     </SequenceItem>
 *   </ScrollSequence>
 */

// Context exposes normalized scroll progress to child items.

interface ScrollSequenceContext {
  progress: MotionValue<number>;
}

const Ctx = createContext<ScrollSequenceContext | null>(null);

export function useSequenceProgress() {
  const ctx = useContext(Ctx);
  if (!ctx)
    throw new Error("useSequenceProgress must be used inside <ScrollSequence>");
  return ctx.progress;
}

// Container that maps the section scroll into a 0..1 progress value.

interface ScrollSequenceProps {
  children: ReactNode;
  /** How many "pages" (viewports) tall the scroll region should be */
  pages?: number;
  className?: string;
}

export function ScrollSequence({
  children,
  pages = 3,
  className = "",
}: ScrollSequenceProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  return (
    <Ctx.Provider value={{ progress: scrollYProgress }}>
      <div
        ref={containerRef}
        className={`relative ${className}`}
        style={{ height: `${pages * 100}vh` }}
      >
        <div className="sticky top-0 h-screen overflow-hidden flex items-center justify-center">
          {children}
        </div>
      </div>
    </Ctx.Provider>
  );
}

// Child item that occupies part of the parent progress window.

interface SequenceItemProps {
  children: ReactNode;
  /** Scroll progress (0→1) at which this item starts entering */
  start?: number;
  /** Scroll progress (0→1) at which this item finishes exiting */
  end?: number;
  /** Animation style */
  animation?: "fade" | "slide-up" | "scale" | "slide-left";
  className?: string;
}

export function SequenceItem({
  children,
  start = 0,
  end = 1,
  animation = "fade",
  className = "",
}: SequenceItemProps) {
  const progress = useSequenceProgress();

  // Reserve 20% of the window for enter and exit, with a stable hold in between.
  const midIn = start + (end - start) * 0.2; // 20% of window for enter
  const midOut = end - (end - start) * 0.2; // 20% of window for exit

  const opacity = useTransform(
    progress,
    [start, midIn, midOut, end],
    [0, 1, 1, 0]
  );

  // Keep transforms wired for every mode so output shape stays predictable.
  const y = useTransform(
    progress,
    [start, midIn, midOut, end],
    animation === "slide-up" ? [60, 0, 0, -60] : [0, 0, 0, 0]
  );

  const x = useTransform(
    progress,
    [start, midIn, midOut, end],
    animation === "slide-left" ? [80, 0, 0, -80] : [0, 0, 0, 0]
  );

  const scale = useTransform(
    progress,
    [start, midIn, midOut, end],
    animation === "scale" ? [0.8, 1, 1, 0.8] : [1, 1, 1, 1]
  );

  return (
    <motion.div
      className={`absolute inset-0 flex items-center justify-center ${className}`}
      style={{ opacity, y, x, scale }}
    >
      {children}
    </motion.div>
  );
}

/**
 * useScrollTransform — use within <ScrollSequence> to map scroll progress
 * to any value range. E.g. useScrollTransform([0, 0.5, 1], [0, 100, 200])
 */
export function useScrollTransform<T>(
  inputRange: number[],
  outputRange: T[]
): MotionValue<T> {
  const progress = useSequenceProgress();
  return useTransform(progress, inputRange, outputRange);
}
