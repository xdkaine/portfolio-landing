"use client";

import { motion } from "motion/react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { useSiteSettings } from "@/lib/useSiteSettings";

const specs = [
  { label: "ROLE", value: "FULL-STACK DEVELOPER" },
  { label: "FOCUS", value: "FRONTEND ENGINEERING" },
  { label: "LOCATION", value: "REMOTE" },
  { label: "EXPERIENCE", value: "5+ YEARS" },
  { label: "STATUS", value: "AVAILABLE", accent: true },
];

const techTree = [
  {
    category: "LANGUAGES",
    items: ["TypeScript", "Rust", "Python", "GLSL"],
  },
  {
    category: "FRONTEND",
    items: ["React", "Next.js", "Tailwind CSS", "WebGL"],
  },
  {
    category: "BACKEND",
    items: ["Node.js", "PostgreSQL", "Redis", "GraphQL"],
  },
  {
    category: "TOOLS",
    items: ["Git", "Docker", "Figma", "Linux"],
  },
];

export default function AboutPage() {
  const settings = useSiteSettings();

  return (
    <>
      {/* Header */}
      <section className="pt-32 pb-12 px-6 md:px-12 lg:px-24">
        <ScrollReveal>
          <div className="flex items-center gap-3 text-steel text-[10px] tracking-[0.3em] mb-6">
            <span>{settings.siteName}</span>
            <span>/</span>
            <span className="text-ember">ABOUT</span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.05}>
          <h1 className="font-display text-6xl md:text-8xl lg:text-9xl tracking-tighter">
            SYSTEM INFO
          </h1>
        </ScrollReveal>
      </section>

      {/* Profile summary */}
      <section className="px-6 md:px-12 lg:px-24 pb-16">
        <ScrollReveal delay={0.1}>
          <div className="border-2 border-iron p-6 md:p-8 max-w-2xl">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-[10px] tracking-[0.3em] text-steel">
                $ cat /etc/profile
              </span>
              <span className="cursor-blink text-ember text-xs">&#9608;</span>
            </div>

            <div className="space-y-3">
              {specs.map((spec, i) => (
                <motion.div
                  key={spec.label}
                  className="flex items-center gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: 0.3 + i * 0.08,
                    duration: 0.4,
                    ease: [0.25, 0.1, 0.25, 1],
                  }}
                >
                  <span className="text-[10px] tracking-[0.2em] text-iron w-28 shrink-0">
                    {spec.label}
                  </span>
                  <span className="text-iron">:</span>
                  <span
                    className={`text-xs tracking-[0.1em] ${
                      spec.accent ? "text-ember" : "text-bone"
                    }`}
                  >
                    {spec.value}
                  </span>
                  {spec.accent && (
                    <span className="w-1.5 h-1.5 bg-ember rounded-full animate-pulse ml-1" />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Bio */}
      <section className="px-6 md:px-12 lg:px-24 pb-24">
        <ScrollReveal delay={0.1}>
          <div className="border-l-2 border-ember pl-6 md:pl-10 max-w-3xl">
            <p className="text-sm md:text-base leading-relaxed text-bone mb-6">
              I&apos;m a developer who cares about craft. I believe code is a
              creative medium &mdash; not just a means to an end. Every
              interface I build is an exercise in precision, performance, and
              intentional design.
            </p>
            <p className="text-sm md:text-base leading-relaxed text-ash mb-6">
              I specialize in frontend engineering with a deep understanding of
              the full stack. My work sits at the intersection of technical
              excellence and visual design &mdash; building things that are as
              beautiful under the hood as they are on screen.
            </p>
            <p className="text-sm md:text-base leading-relaxed text-ash">
              When I&apos;m not shipping code, I&apos;m exploring generative
              art, contributing to open source, or writing about the things I
              learn along the way.
            </p>
          </div>
        </ScrollReveal>
      </section>

      {/* Tech tree */}
      <section className="px-6 md:px-12 lg:px-24 pb-24">
        <ScrollReveal>
          <div className="border-b-2 border-bone pb-4 mb-12">
            <h2 className="font-display text-4xl md:text-5xl">TECH STACK</h2>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl">
          {techTree.map((group, gi) => (
            <ScrollReveal key={group.category} delay={gi * 0.08}>
              <div>
                <span className="text-[10px] tracking-[0.3em] text-steel block mb-3">
                  {group.category}/
                </span>
                <div className="space-y-1">
                  {group.items.map((item, ii) => {
                    const isLast = ii === group.items.length - 1;
                    return (
                      <div key={item} className="flex items-center gap-2">
                        <span className="text-iron text-xs">
                          {isLast ? "\u2514\u2500\u2500" : "\u251C\u2500\u2500"}
                        </span>
                        <span className="text-xs text-bone tracking-[0.05em]">
                          {item}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

    </>
  );
}
