"use client";

import { motion, useMotionValue, useTransform, type MotionValue } from "motion/react";
import { useLayoutEffect, useRef, type RefObject } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import type { HomeStat } from "@/lib/homeStats";

const HEADLINE = "BUILDING ANYTHING & EVERYTHING.";
const clamp = (value: number) => Math.min(1, Math.max(0, value));

// Keep SSR/no-JS readable. Enhance only after measuring the real viewport.
// Scroll changes schedule one frame; a stationary page never advances on a timer.
function useViewportProgress(ref: RefObject<HTMLElement | null>, start: number, end: number) {
  const progress = useMotionValue(1);
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    if (reduced || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { progress.set(1); return; }
    let frame = 0;
    let active = true;
    const measure = () => {
      frame = 0;
      const element = ref.current;
      if (active && element) progress.set(clamp((innerHeight * start - element.getBoundingClientRect().top) / (innerHeight * (start - end))));
    };
    const schedule = () => { if (!frame && active) frame = requestAnimationFrame(measure); };
    schedule();
    void document.fonts.ready.then(schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => { active = false; cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, [end, progress, reduced, ref, start]);
  return progress;
}

function Stat({ stat, index }: { stat: HomeStat; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = useViewportProgress(ref, 0.94, 0.40);
  const progress = useTransform(scroll, value => clamp((value - index * 0.055) / (0.78 - index * 0.055)));
  const y = useTransform(progress, value => -56 * (1 - value) ** 2);
  const clipPath = useTransform(progress, value => `inset(0 0 ${(1 - value) * 100}% 0)`);
  const filter = useTransform(progress, value => `blur(${(1 - value) * 6}px)`);
  return <div ref={ref} data-home-stat={stat.id} className="home-stat">
    <dt className="home-stat-label">{stat.label}</dt>
    <dd className="home-stat-value">
      <span className="sr-only" data-stat-value>{stat.value}</span>
      <motion.span aria-hidden="true" data-stat-face style={{ y, clipPath, filter }}>{stat.value}<span className="home-stat-plus">+</span></motion.span>
    </dd>
  </div>;
}

function Word({ text, index, total, progress }: { text: string; index: number; total: number; progress: MotionValue<number> }) {
  const clipPath = useTransform(progress, value => `inset(0 ${(1 - clamp(value * total - index)) * 100}% 0 0)`);
  return <span className="home-motion-word">
    <span className="home-motion-outline">{text}</span>
    <motion.span data-word-fill style={{ clipPath }} className={`home-motion-fill ${text === "&" ? "text-ember" : "text-bone"}`}>{text}</motion.span>
  </span>;
}

export function HomeMotionBand({ stats }: { stats: HomeStat[] }) {
  const textRef = useRef<HTMLHeadingElement>(null);
  const progress = useViewportProgress(textRef, 0.90, 0.24);
  const words = HEADLINE.split(" ");
  return <section data-home-motion className="home-motion-band border-t border-iron px-6 py-12 md:px-12 md:py-16 lg:px-24" aria-labelledby="building-anything">
    <dl className="home-stats">{stats.map((stat, index) => <Stat key={stat.id} stat={stat} index={index} />)}</dl>
    <h2 ref={textRef} id="building-anything" data-motion-text className="home-motion-headline font-display">
      <span className="sr-only">{HEADLINE}</span>
      <span aria-hidden="true" className="home-motion-words">{words.map((word, index) => <Word key={`${word}-${index}`} text={word} index={index} total={words.length} progress={progress} />)}</span>
    </h2>
  </section>;
}
