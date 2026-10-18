"use client";

import { motion, useInView } from "motion/react";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useMemo, useRef } from "react";
import { AliasTypewriter } from "@/components/AliasTypewriter";
import { TitleTypewriter } from "@/components/TitleTypewriter";
import { PORTFOLIO_NAME, PORTFOLIO_TITLE } from "@/lib/siteMetadata";
import { PORTFOLIO_PROFILE } from "@/lib/portfolioProfile";
import { PublicLink, PublicSharedElement } from "@/components/PublicTransition";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Marquee } from "@/components/Marquee";
import { ScrollParallax, ScrollZoom } from "@/components/ScrollParallax";
import { ScrollTextReveal } from "@/components/ScrollTextReveal";
import { TypewriterText } from "@/components/TypewriterText";
import { parseBrandAliases } from "@/lib/brandAliases";
import type { PublicSiteSettings } from "@/lib/siteSettings-schema";

interface HomeProject {
  id: string;
  number: string;
  title: string;
  description: string;
  tags: string[];
  status: "LIVE" | "IN PROGRESS" | "ARCHIVED";
  featured: boolean;
}

interface HomePost {
  id: string;
  slug: string;
  title: string;
  date: string;
  readTime: string;
  tags: string[];
}

// Stat block that reveals with a top-down wipe instead of a count-up animation.

function ScrollCounter({
  value,
  label,
  suffix = "",
  delay = 0,
}: {
  value: number;
  label: string;
  suffix?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = Boolean(useReducedMotion());
  const isInView = useInView(ref, {
    once: true,
    margin: "0px 0px -18% 0px",
  });
  const hiddenValue = {
    opacity: 0,
    y: -64,
    clipPath: "inset(0 0 100% 0)",
    filter: "blur(10px)",
  };
  const visibleValue = {
    opacity: 1,
    y: 0,
    clipPath: "inset(0 0 0% 0)",
    filter: "blur(0px)",
  };
  const hiddenLabel = { opacity: 0, x: 24, filter: "blur(4px)" };
  const visibleLabel = { opacity: 1, x: 0, filter: "blur(0px)" };

  return (
    <div ref={ref}>
      <div className="overflow-hidden relative">
        <motion.div
          initial={shouldReduceMotion ? false : hiddenValue}
          animate={shouldReduceMotion || isInView ? visibleValue : hiddenValue}
          transition={{
            duration: shouldReduceMotion ? 0 : 1.05,
            delay: shouldReduceMotion ? 0 : delay,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="font-display text-5xl md:text-7xl lg:text-8xl text-bone tabular-nums leading-none will-change-transform"
        >
          <span>{value}</span>
          <span className="text-ember">{suffix}</span>
        </motion.div>
        {shouldReduceMotion ? null : (
          <motion.div
            aria-hidden="true"
            initial={{ y: "0%" }}
            animate={isInView ? { y: "110%" } : { y: "0%" }}
            transition={{
              duration: 0.95,
              delay,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="pointer-events-none absolute inset-0 bg-linear-to-b from-void via-void/95 to-transparent"
          />
        )}
      </div>
      <div className="overflow-hidden mt-3">
        <motion.span
          initial={shouldReduceMotion ? false : hiddenLabel}
          animate={shouldReduceMotion || isInView ? visibleLabel : hiddenLabel}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.7,
            delay: shouldReduceMotion ? 0 : delay + 0.12,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="text-[10px] tracking-[0.3em] text-steel block will-change-transform"
        >
          {label}
        </motion.span>
      </div>
    </div>
  );
}

// Featured project row used in the work section.

function ProjectCard({
  project,
  index,
}: {
  project: HomeProject;
  index: number;
}) {
  return (
    <ScrollReveal className="home-content-reveal" delay={index * 0.08} variant="row">
      <PublicLink href={`/v1/projects/${project.number}`} intent="drill-in" className="group block">
        <article className="border-b border-iron py-8 md:py-10 hover:bg-surface/50 transition-colors duration-500 -mx-6 md:-mx-12 lg:-mx-24 px-6 md:px-12 lg:px-24">
          <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-12">
            {/* Number + Title */}
            <div className="flex items-baseline gap-4 md:w-[45%] shrink-0">
              <PublicSharedElement kind="project-marker" itemKey={project.number}>
                <span className="font-display text-4xl md:text-6xl text-steel group-hover:text-ember transition-colors duration-500">
                  {project.number}
                </span>
              </PublicSharedElement>
              <div className="min-w-0">
                <PublicSharedElement kind="project-title" itemKey={project.number}>
                  <h3 className="font-display text-xl md:text-3xl text-bone group-hover:text-ember transition-colors duration-300 leading-tight">
                    {project.title}
                  </h3>
                </PublicSharedElement>
                <div className="flex flex-wrap gap-2 mt-2">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] tracking-[0.12em] text-steel"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="flex-1 min-w-0">
              <p className="text-ash text-sm md:text-base leading-relaxed" data-project-teaser>
                {project.description}
              </p>
              <span className="mt-4 inline-block text-[11px] tracking-[0.15em] text-ash group-hover:text-ember transition-colors">
                VIEW CASE STUDY <span aria-hidden="true">&rarr;</span>
              </span>
            </div>

            {/* Status + Arrow */}
            <div className="flex items-center gap-4 md:flex-col md:items-end md:gap-2 shrink-0">
              <span
                className={`text-[11px] tracking-[0.15em] px-2 py-0.5 ${
                  project.status === "LIVE"
                    ? "text-status-live border border-status-live/30"
                    : project.status === "IN PROGRESS"
                      ? "text-status-progress border border-status-progress/30"
                      : "text-steel border border-iron"
                }`}
              >
                {project.status}
              </span>
              <span className="text-ash group-hover:text-ember group-hover:translate-x-1 transition-[color,transform] duration-300 text-sm">
                &rarr;
              </span>
            </div>
          </div>
        </article>
      </PublicLink>
    </ScrollReveal>
  );
}

// Numbered capability line item.

function CapabilityRow({
  number,
  title,
  items,
  index,
}: {
  number: string;
  title: string;
  items: string[];
  index: number;
}) {
  return (
    <ScrollReveal className="home-content-reveal" delay={index * 0.06} variant="row">
      <div className="group grid grid-cols-[40px_1fr] md:grid-cols-[60px_200px_1fr] gap-4 md:gap-8 py-6 border-b border-iron items-baseline">
        <span className="text-steel text-[10px] tracking-[0.2em] font-display text-lg">
          {number}
        </span>
        <span className="font-display text-base md:text-lg text-bone group-hover:text-ember transition-colors duration-300 col-span-1 md:col-span-1">
          {title}
        </span>
        <div className="col-span-2 md:col-span-1 flex flex-wrap gap-x-4 gap-y-1 pl-10 md:pl-0">
          {items.map((item) => (
            <span
              key={item}
              className="text-xs text-ash tracking-[0.05em]"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </ScrollReveal>
  );
}

interface HomePageClientProps {
  siteSettings: PublicSiteSettings;
  projects: HomeProject[];
  posts: HomePost[];
}

export default function HomePageClient({
  siteSettings,
  projects,
  posts,
}: HomePageClientProps) {
  const shouldReduceMotion = useReducedMotion();
  const brandAliases = useMemo(
    () => parseBrandAliases(siteSettings.siteAliases),
    [siteSettings.siteAliases],
  );

  const featuredProjects = projects;
  const recentPosts = posts;

  return (
    <>
      <TitleTypewriter brandName={siteSettings.siteName} brandAliases={brandAliases} />
      <noscript>
        <style>{`.home-content-reveal { opacity: 1 !important; transform: none !important; clip-path: none !important; }`}</style>
      </noscript>
      {/* Hero */}
      <ScrollZoom from={1} to={0.9} className="relative">
        <section className="min-h-svh flex flex-col justify-center pt-32 pb-36 px-6 md:px-12 lg:px-24 relative">
          <div className="overflow-visible pb-[0.24em]">
            <h1 className="font-display text-[20vw] md:text-[16vw] leading-[1.08] tracking-tighter text-bone">
              <span className="sr-only">{PORTFOLIO_TITLE}</span>
              <span aria-hidden="true">
                {brandAliases.length > 1 ? (
                  <AliasTypewriter
                    aliases={brandAliases}
                  />
                ) : (
                  <TypewriterText
                    text={siteSettings.siteName}
                    startDelay={300}
                    typingSpeed={75}
                  />
                )}
              </span>
            </h1>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <p
              className="text-ash text-xs md:text-sm tracking-[0.3em] uppercase"
            >
              {siteSettings.heroSubtitle}
            </p>
            <motion.span
              className="cursor-blink text-ember text-xs md:text-sm"
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: shouldReduceMotion ? 0 : 1.1, duration: shouldReduceMotion ? 0 : 0.25 }}
            >
              &#9608;
            </motion.span>
          </div>

          <p className="mt-8 max-w-2xl text-base md:text-lg leading-relaxed text-ash">
            I&apos;m {PORTFOLIO_NAME}, a systems engineer and developer. I build
            infrastructure and applications, and this is where I share the
            systems I deploy and the work behind them.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <PublicLink
              href="/v1/projects"
              intent="section"
              className="inline-flex min-h-12 items-center justify-center gap-3 border-2 border-ember bg-ember px-6 py-3 text-xs tracking-[0.15em] text-void hover:border-bone hover:bg-bone focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember transition-colors"
            >
              VIEW PROJECTS <span aria-hidden="true">&rarr;</span>
            </PublicLink>
            <PublicLink
              href="/v1/contact"
              intent="section"
              className="inline-flex min-h-12 items-center justify-center gap-3 border-2 border-steel px-6 py-3 text-xs tracking-[0.15em] text-bone hover:border-ember hover:text-ember focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember transition-colors"
            >
              CONTACT ME <span aria-hidden="true">&rarr;</span>
            </PublicLink>
          </div>

          {/* Scroll hint */}
          <ScrollParallax speed={-0.4} className="absolute bottom-8 left-6 md:left-12">
            <motion.div
              className="flex items-end gap-3"
              initial={shouldReduceMotion ? false : { clipPath: "inset(100% 0 0 0)" }}
              animate={{ clipPath: "inset(0)" }}
              transition={{
                delay: shouldReduceMotion ? 0 : 0.9,
                duration: shouldReduceMotion ? 0 : 0.62,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <span className="text-steel text-[10px] tracking-[0.4em] uppercase [writing-mode:vertical-rl] rotate-180">
                SCROLL
              </span>
              <motion.div
                className="w-px h-16 bg-steel origin-top"
                animate={shouldReduceMotion ? { scaleY: 1 } : { scaleY: [0, 1, 0] }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { duration: 2, repeat: Infinity, ease: "easeInOut" }
                }
              />
            </motion.div>
          </ScrollParallax>

          {/* Location stamp */}
          <ScrollParallax
            speed={0.5}
            className="absolute top-24 right-6 md:right-12 text-steel text-[10px] tracking-[0.2em] text-right hidden md:block"
          >
            <motion.div
              initial={shouldReduceMotion ? false : { clipPath: "inset(0 0 100% 0)", y: -10 }}
              animate={{ clipPath: "inset(0)", y: 0 }}
              transition={{
                delay: shouldReduceMotion ? 0 : 0.95,
                duration: shouldReduceMotion ? 0 : 0.62,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <p>{PORTFOLIO_PROFILE.location}</p>
              <p className="mt-2">APPLICATIONS / INFRASTRUCTURE</p>
            </motion.div>
          </ScrollParallax>
        </section>
      </ScrollZoom>

      {/* Marquee */}
      <Marquee text="DEVELOPER WHO LOVES TO BUILD &mdash; SOLVING REAL PROBLEMS &mdash; CRAFTING THOUGHTFUL DIGITAL EXPERIENCES &mdash; " />

      {/* Selected work */}
      <section className="py-24 md:py-32 px-6 md:px-12 lg:px-24">
        <ScrollReveal className="home-content-reveal" variant="headline">
          <div className="flex justify-between items-end border-b-2 border-bone pb-4 mb-4">
            <h2 className="font-display text-5xl md:text-7xl">
              SELECTED WORK
            </h2>
            <span className="text-ash text-sm">
              ({String(featuredProjects.length).padStart(2, "0")})
            </span>
          </div>
        </ScrollReveal>

        {featuredProjects.length === 0 && (
          <p className="py-8 text-sm leading-relaxed text-ash">
            New project write-ups are on the way.
          </p>
        )}

        {featuredProjects.map((project, i) => (
          <ProjectCard key={project.id} project={project} index={i} />
        ))}

        <ScrollReveal className="home-content-reveal" delay={0.2} variant="row">
          <div className="mt-12">
            <PublicLink
              href="/v1/projects"
              intent="section"
              className="inline-flex items-center gap-2 text-xs tracking-[0.2em] text-ash hover:text-ember transition-colors border-b border-transparent hover:border-ember pb-1"
            >
              VIEW ALL PROJECTS &rarr;
            </PublicLink>
          </div>
        </ScrollReveal>
      </section>

      {/* Stats */}
      <section className="py-24 md:py-32 px-6 md:px-12 lg:px-24 border-t border-iron">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 md:gap-8">
          <ScrollCounter value={6} label="PROJECTS SHIPPED" suffix="+" delay={0} />
          <ScrollCounter value={PORTFOLIO_PROFILE.experienceYears} label="YEARS EXPERIENCE" suffix="+" delay={0.08} />
          <ScrollCounter value={8} label="TECHNOLOGIES" suffix="+" delay={0.16} />
          <ScrollCounter value={24} label="HOUR RESPONSE" suffix="H" delay={0.24} />
        </div>
      </section>

      {/* Manifesto */}
      <section className="py-32 md:py-48 px-6 md:px-12 lg:px-24 border-t border-iron">
        <ScrollTextReveal
          text="BUILDING ANYTHING & EVERYTHING."
          mode="word"
          className="font-display text-3xl md:text-5xl lg:text-6xl leading-[1.2] max-w-5xl gap-x-[0.3em]"
          itemClassName="text-bone"
          startOffset="start 75%"
          endOffset="start 15%"
        />
      </section>

      {/* Capabilities */}
      <section className="py-24 md:py-32 px-6 md:px-12 lg:px-24 border-t border-iron">
        <ScrollReveal className="home-content-reveal" variant="headline">
          <h2 className="font-display text-5xl md:text-7xl mb-12">
            CAPABILITIES
          </h2>
        </ScrollReveal>

        <CapabilityRow
          number="01"
          title="FRONTEND"
          items={["React", "Next.js", "TypeScript", "Tailwind CSS"]}
          index={0}
        />
        <CapabilityRow
          number="02"
          title="ANIMATION"
          items={["Motion", "GSAP", "CSS Animations", "Scroll-driven", "SVG"]}
          index={1}
        />
        <CapabilityRow
          number="03"
          title="SYSTEMS"
          items={["Design tokens", "Component libraries", "CI/CD", "Testing"]}
          index={2}
        />
        <CapabilityRow
          number="04"
          title="PERFORMANCE"
          items={["Core Web Vitals", "Bundle splitting", "Lazy loading", "SSR"]}
          index={3}
        />
        <CapabilityRow
          number="05"
          title="BACKEND"
          items={["Node.js", "PostgreSQL", "GraphQL", "REST", "Redis"]}
          index={4}
        />
        <CapabilityRow
          number="06"
          title="TOOLING"
          items={["CLI", "Docker", "Git", "Figma", "Linux"]}
          index={5}
        />
      </section>

      {/* Latest BLOG */}
      <section className="py-24 md:py-32 px-6 md:px-12 lg:px-24 border-t border-iron">
        <ScrollReveal className="home-content-reveal" variant="headline">
          <div className="flex justify-between items-end border-b-2 border-bone pb-4 mb-16">
            <h2 className="font-display text-5xl md:text-7xl">
              BLOG
            </h2>
            <span className="text-ash text-sm">
              ({String(recentPosts.length).padStart(2, "0")})
            </span>
          </div>
        </ScrollReveal>

        <div>
          {recentPosts.length === 0 && (
            <p className="py-6 text-sm leading-relaxed text-ash">
              New notes from the build are on the way.
            </p>
          )}
          {recentPosts.map((post, i) => (
            <ScrollReveal className="home-content-reveal" key={post.id} delay={i * 0.08} variant="row">
              <PublicLink
                href={`/v1/blog/${post.slug}`}
                intent="drill-in"
                className="group block border-b border-iron py-6 transition-transform duration-500 hover:translate-x-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-8">
                  <div className="flex items-start md:items-center gap-4 md:gap-8 flex-1 min-w-0">
                    <span className="text-steel text-[10px] tracking-[0.15em] shrink-0 pt-1 md:pt-0">
                      {post.date}
                    </span>
                    <PublicSharedElement kind="post-title" itemKey={post.slug}>
                      <h3 className="text-sm md:text-base group-hover:text-ember transition-colors duration-300 truncate">
                        {post.title}
                      </h3>
                    </PublicSharedElement>
                  </div>
                  <div className="flex items-center gap-4 md:gap-6 shrink-0 ml-auto">
                    <div className="hidden md:flex gap-2">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] tracking-widest text-steel"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-ash text-[10px] tracking-[0.15em]">
                      {post.readTime}
                    </span>
                    <span className="text-ash group-hover:text-ember transition-colors">
                      &rarr;
                    </span>
                  </div>
                </div>
              </PublicLink>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal className="home-content-reveal" delay={0.2} variant="row">
          <PublicLink
            href="/v1/blog"
            intent="section"
            className="mt-12 inline-flex items-center gap-2 text-xs tracking-[0.2em] text-ash hover:text-ember transition-colors border-b border-transparent hover:border-ember pb-1"
          >
            ALL BLOGS &rarr;
          </PublicLink>
        </ScrollReveal>
      </section>

      {/* About teaser: fade-in is more reliable than scroll-text-reveal near page end. */}
      <section className="py-32 md:py-48 px-6 md:px-12 lg:px-24 border-t border-iron relative">
        <ScrollReveal className="home-content-reveal" variant="headline">
          <p className="font-display text-4xl md:text-6xl lg:text-7xl leading-[1.1] max-w-5xl">
            BUILDING SYSTEMS & SOLUTIONS
            <br />
            <span className="text-ember">FOR EVERYONE.</span>
          </p>
        </ScrollReveal>
        <ScrollReveal className="home-content-reveal" delay={0.15} variant="row">
          <PublicLink
            href="/v1/about"
            intent="section"
            className="mt-10 inline-flex items-center gap-2 text-xs tracking-[0.2em] text-ash hover:text-ember transition-colors border-b border-transparent hover:border-ember pb-1"
          >
            MORE ABOUT ME &rarr;
          </PublicLink>
        </ScrollReveal>

        <ScrollParallax
          speed={0.3}
          className="absolute right-6 md:right-12 lg:right-24 top-1/2 -translate-y-1/2 hidden lg:block"
        >
          <span className="text-steel text-[10px] tracking-[0.3em] [writing-mode:vertical-rl]">
            SECTION.08 // ABOUT
          </span>
        </ScrollParallax>
      </section>
    </>
  );
}
