"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

/**
 * ScrollTextReveal — text that reveals word-by-word (or character-by-character)
 * as the user scrolls. Each word/character goes from dim/transparent to full
 * opacity based on its position in the scroll timeline.
 *
 * Similar to Apple's product page text reveals.
 */

interface ScrollTextRevealProps {
  /** The text to reveal */
  text: string;
  /** Reveal per word or per character */
  mode?: "word" | "character";
  /** Additional tailwind classes for the container */
  className?: string;
  /** Classes for each individual word/char span */
  itemClassName?: string;
  /** Scroll offset config: when to start/end the reveal relative to the element */
  startOffset?: string;
  endOffset?: string;
}

export function ScrollTextReveal({
  text,
  mode = "word",
  className = "",
  itemClassName = "",
  startOffset = "start 80%",
  endOffset = "end 20%",
}: ScrollTextRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    offset: [startOffset, endOffset] as any,
  });

  const items = mode === "word" ? text.split(" ") : text.split("");

  return (
    <div ref={containerRef} className={`flex flex-wrap ${className}`}>
      {items.map((item, i) => (
        <Word
          key={`${item}-${i}`}
          text={mode === "word" ? item : item}
          index={i}
          total={items.length}
          progress={scrollYProgress}
          isWord={mode === "word"}
          className={itemClassName}
          shouldReduceMotion={Boolean(shouldReduceMotion)}
        />
      ))}
    </div>
  );
}

// Animated token unit used by word and character reveal modes.

interface WordProps {
  text: string;
  index: number;
  total: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  isWord: boolean;
  className: string;
  shouldReduceMotion: boolean;
}

function Word({ text, index, total, progress, isWord, className, shouldReduceMotion }: WordProps) {
  // Divide progress evenly so tokens reveal in a predictable sequence.
  const start = index / total;
  const end = (index + 1) / total;

  const opacity = useTransform(progress, [start, end], [0.15, 1]);
  const y = useTransform(progress, [start, end], [4, 0]);

  return (
    <motion.span
      className={`inline-block transition-colors ${className}`}
      style={shouldReduceMotion ? undefined : { opacity, y }}
    >
      {text}
      {isWord && "\u00A0"}
    </motion.span>
  );
}

/**
 * ScrollLineReveal — reveals lines of text one at a time based on scroll.
 * Each line fades + slides up as its scroll window is reached.
 */

interface ScrollLineRevealProps {
  lines: string[];
  className?: string;
  lineClassName?: string;
}

export function ScrollLineReveal({
  lines,
  className = "",
  lineClassName = "",
}: ScrollLineRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 80%", "end 30%"],
  });

  return (
    <div ref={containerRef} className={className}>
      {lines.map((line, i) => {
        const start = i / lines.length;
        const end = (i + 0.8) / lines.length;

        return (
          <Line
            key={`${line}-${i}`}
            text={line}
            start={start}
            end={end}
            progress={scrollYProgress}
            className={lineClassName}
            shouldReduceMotion={Boolean(shouldReduceMotion)}
          />
        );
      })}
    </div>
  );
}

function Line({
  text,
  start,
  end,
  progress,
  className,
  shouldReduceMotion,
}: {
  text: string;
  start: number;
  end: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  className: string;
  shouldReduceMotion: boolean;
}) {
  const opacity = useTransform(progress, [start, end], [0, 1]);
  const y = useTransform(progress, [start, end], [30, 0]);
  const x = useTransform(progress, [start, end], [-10, 0]);

  return (
    <motion.p className={className} style={shouldReduceMotion ? undefined : { opacity, y, x }}>
      {text}
    </motion.p>
  );
}
