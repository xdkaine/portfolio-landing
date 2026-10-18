"use client";

import { ScrollReveal } from "@/components/ScrollReveal";
import { useSiteSettings } from "@/lib/useSiteSettings";
import { PORTFOLIO_NAME } from "@/lib/siteMetadata";
import { PORTFOLIO_PROFILE } from "@/lib/portfolioProfile";

const specs = [
  { label: "ROLE", value: "TECHNOLOGY RISK CONSULTANT" },
  { label: "FOCUS", value: "ENTERPRISE TECHNOLOGY, ERP & SUPPORTING SYSTEMS" },
  { label: "LOCATION", value: PORTFOLIO_PROFILE.location },
  { label: "EXPERIENCE", value: `${PORTFOLIO_PROFILE.experienceYears}+ YEARS` },
  { label: "STATUS", value: "AVAILABLE", accent: true },
];

const techTree = [
  {
    category: "LANGUAGES",
    items: ["TypeScript", "Python", "Lua", "PHP", "SQL"],
  },
  {
    category: "FRONTEND",
    items: ["React", "Next.js", "Vue", "Tailwind"],
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
        <ScrollReveal variant="row">
          <div className="flex items-center gap-3 text-steel text-[10px] tracking-[0.3em] mb-6">
            <span>{settings.siteName}</span>
            <span>/</span>
            <span className="text-ember">ABOUT</span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.05} variant="headline">
          <h1 className="font-display text-[clamp(3rem,9vw,8rem)] leading-[1.05] tracking-tighter text-balance">
            ABOUT {PORTFOLIO_NAME.toUpperCase()}
          </h1>
        </ScrollReveal>
      </section>

      {/* Profile summary */}
      <section className="px-6 md:px-12 lg:px-24 pb-16">
        <ScrollReveal delay={0.1} variant="block">
          <div className="border-2 border-iron p-6 md:p-8 max-w-2xl">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-[10px] tracking-[0.3em] text-steel">
                $ cat /etc/profile
              </span>
              <span className="cursor-blink text-ember text-xs">&#9608;</span>
            </div>

            <div className="space-y-3">
              {specs.map((spec) => (
                <div
                  key={spec.label}
                  className="flex items-start gap-3 sm:gap-4"
                >
                  <span className="text-[10px] tracking-[0.2em] text-steel w-20 sm:w-28 shrink-0">
                    {spec.label}
                  </span>
                  <span className="text-steel">:</span>
                  <span
                    className={`min-w-0 text-xs leading-relaxed tracking-[0.1em] ${
                      spec.accent ? "text-ember" : "text-bone"
                    }`}
                  >
                    {spec.value}
                  </span>
                  {spec.accent && (
                    <span className="w-1.5 h-1.5 bg-ember rounded-full animate-pulse ml-1" />
                  )}
                </div>
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
              I&apos;m a developer who works across applications and infrastructure. The work I enjoy
              most is building and deploying systems that other people actually use.
              That can mean an application, the infrastructure behind it, or getting
              the two working together.
            </p>
            <p className="text-sm md:text-base leading-relaxed text-ash mb-6">
              Having people rely on something I built is what makes technology
              rewarding for me. It adds pressure, but I enjoy that responsibility:
              keeping things running, working through problems, and improving a
              system as people use it.
            </p>
            <p className="text-sm md:text-base leading-relaxed text-ash">
              I currently work as a Technology Risk Consultant, supporting work
              across enterprise technologies, ERP platforms, and the systems around
              them. Outside that role, I keep building applications and infrastructure,
              and use this site to share what I&apos;m working on and learning.
            </p>
          </div>
        </ScrollReveal>
      </section>

      {/* Tech tree */}
      <section className="px-6 md:px-12 lg:px-24 pb-24">
        <ScrollReveal variant="headline">
          <div className="border-b-2 border-bone pb-4 mb-12">
            <h2 className="font-display text-4xl md:text-5xl">TECH STACK</h2>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl">
          {techTree.map((group, gi) => (
            <ScrollReveal key={group.category} delay={gi * 0.08} variant="row">
              <div>
                <span className="text-[10px] tracking-[0.3em] text-steel block mb-3">
                  {group.category}/
                </span>
                <div className="space-y-1">
                  {group.items.map((item, ii) => {
                    const isLast = ii === group.items.length - 1;
                    return (
                      <div key={item} className="flex items-center gap-2">
                        <span className="text-steel text-xs">
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
