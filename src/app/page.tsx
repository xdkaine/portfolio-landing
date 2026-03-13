"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AliasTypewriter } from "@/components/AliasTypewriter";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Marquee } from "@/components/Marquee";
import { ScrollParallax, ScrollZoom } from "@/components/ScrollParallax";
import { ScrollTextReveal } from "@/components/ScrollTextReveal";
import { TypewriterText } from "@/components/TypewriterText";
import { parseBrandAliases } from "@/lib/brandAliases";
import { useSiteSettings } from "@/lib/useSiteSettings";

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

// Counts up when the metric enters view.

function ScrollCounter({
  value,
  label,
  suffix = "",
}: {
  value: number;
  label: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 90%", "start 30%"],
  });
  const count = useTransform(scrollYProgress, [0, 1], [0, value]);
  const rounded = useTransform(count, (v) => Math.round(v));

  return (
    <div ref={ref}>
      <div className="font-display text-5xl md:text-7xl lg:text-8xl text-bone tabular-nums leading-none">
        <motion.span>{rounded}</motion.span>
        <span className="text-ember">{suffix}</span>
      </div>
      <span className="text-[10px] tracking-[0.3em] text-steel mt-3 block">
        {label}
      </span>
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
    <ScrollReveal delay={index * 0.08}>
      <Link href={`/projects/${project.number}`} className="group block">
        <article className="border-b border-iron py-8 md:py-10 hover:bg-surface/50 transition-colors duration-500 -mx-6 md:-mx-12 lg:-mx-24 px-6 md:px-12 lg:px-24">
          <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-12">
            {/* Number + Title */}
            <div className="flex items-baseline gap-4 md:w-[45%] shrink-0">
              <span className="font-display text-4xl md:text-6xl text-iron group-hover:text-ember transition-colors duration-500">
                {project.number}
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-xl md:text-3xl text-bone group-hover:text-ember transition-colors duration-300 leading-tight">
                  {project.title}
                </h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[9px] tracking-[0.12em] text-steel"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-ash text-xs md:text-sm leading-relaxed flex-1">
              {project.description}
            </p>

            {/* Status + Arrow */}
            <div className="flex items-center gap-4 md:flex-col md:items-end md:gap-2 shrink-0">
              <span
                className={`text-[9px] tracking-[0.15em] px-2 py-0.5 ${
                  project.status === "LIVE"
                    ? "text-emerald-400 border border-emerald-400/30"
                    : project.status === "IN PROGRESS"
                      ? "text-amber-400 border border-amber-400/30"
                      : "text-steel border border-iron"
                }`}
              >
                {project.status}
              </span>
              <span className="text-ash group-hover:text-ember group-hover:translate-x-1 transition-all duration-300 text-sm">
                &rarr;
              </span>
            </div>
          </div>
        </article>
      </Link>
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
    <ScrollReveal delay={index * 0.06}>
      <div className="group grid grid-cols-[40px_1fr] md:grid-cols-[60px_200px_1fr] gap-4 md:gap-8 py-6 border-b border-iron items-baseline">
        <span className="text-iron text-[10px] tracking-[0.2em] font-display text-lg">
          {number}
        </span>
        <span className="font-display text-base md:text-lg text-bone group-hover:text-ember transition-colors duration-300 col-span-1 md:col-span-1">
          {title}
        </span>
        <div className="col-span-2 md:col-span-1 flex flex-wrap gap-x-4 gap-y-1 pl-[40px] md:pl-0">
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

export default function Home() {
  const siteSettings = useSiteSettings();
  const brandAliases = useMemo(
    () => parseBrandAliases(siteSettings.siteAliases),
    [siteSettings.siteAliases],
  );
  const [projects, setProjects] = useState<HomeProject[]>([]);
  const [posts, setPosts] = useState<HomePost[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadContent = async () => {
      try {
        const [projectsRes, postsRes] = await Promise.all([
          fetch("/api/projects", { cache: "no-store" }),
          fetch("/api/posts", { cache: "no-store" }),
        ]);

        if (!cancelled && projectsRes.ok) {
          const projectsData = (await projectsRes.json()) as unknown;
          if (Array.isArray(projectsData)) {
            // Keep runtime checks strict so invalid API rows do not break rendering.
            const normalized = projectsData
              .map((item: unknown): HomeProject | null => {
                if (!item || typeof item !== "object") {
                  return null;
                }

                const entry = item as Record<string, unknown>;
                if (
                  typeof entry.id !== "string" ||
                  typeof entry.title !== "string" ||
                  typeof entry.description !== "string" ||
                  !Array.isArray(entry.tags)
                ) {
                  return null;
                }

                const tags = entry.tags.filter(
                  (tag: unknown): tag is string => typeof tag === "string",
                );

                return {
                  id: entry.id,
                  number:
                    typeof entry.number === "string" && entry.number.trim()
                      ? entry.number
                      : entry.id,
                  title: entry.title,
                  description: entry.description,
                  tags,
                  status:
                    // API can return either enum format; normalize once for UI usage.
                    entry.status === "IN PROGRESS" || entry.status === "IN_PROGRESS"
                      ? "IN PROGRESS"
                      : entry.status === "ARCHIVED"
                        ? "ARCHIVED"
                        : "LIVE",
                  featured: Boolean(entry.featured),
                };
              })
              .filter((item): item is HomeProject => Boolean(item));

            setProjects(normalized);
          }
        }

        if (!cancelled && postsRes.ok) {
          const postsData = (await postsRes.json()) as unknown;
          if (Array.isArray(postsData)) {
            // Defensive normalization keeps static fallback content as a safe default.
            const normalized = postsData
              .map((item: unknown): HomePost | null => {
                if (!item || typeof item !== "object") {
                  return null;
                }

                const entry = item as Record<string, unknown>;
                if (
                  typeof entry.id !== "string" ||
                  typeof entry.slug !== "string" ||
                  typeof entry.title !== "string" ||
                  typeof entry.date !== "string" ||
                  typeof entry.readTime !== "string" ||
                  !Array.isArray(entry.tags)
                ) {
                  return null;
                }

                const tags = entry.tags.filter(
                  (tag: unknown): tag is string => typeof tag === "string",
                );

                return {
                  id: entry.id,
                  slug: entry.slug,
                  title: entry.title,
                  date: entry.date,
                  readTime: entry.readTime,
                  tags,
                };
              })
              .filter((item): item is HomePost => Boolean(item));

            setPosts(normalized);
          }
        }
      } catch {
        // Keep current data when API is unavailable.
      }
    };

    loadContent();
    return () => {
      cancelled = true;
    };
  }, []);

  const featuredProjects = useMemo(
    () => projects.filter((project) => project.featured).slice(0, 4),
    [projects],
  );
  const recentPosts = useMemo(() => posts.slice(0, 4), [posts]);

  return (
    <>
      {/* Hero */}
      <ScrollZoom from={1} to={0.9} className="relative">
        <section className="min-h-screen flex flex-col justify-center px-6 md:px-12 lg:px-24 relative">
          <div className="overflow-visible pb-[0.24em]">
            <h1 className="font-display text-[20vw] md:text-[16vw] leading-[1.08] tracking-tighter text-bone">
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
            </h1>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <motion.p
              className="text-ash text-xs md:text-sm tracking-[0.3em] uppercase"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {siteSettings.heroSubtitle}
            </motion.p>
            <motion.span
              className="cursor-blink text-ember text-xs md:text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4 }}
            >
              &#9608;
            </motion.span>
          </div>

          {/* Scroll hint */}
          <ScrollParallax speed={-0.4} className="absolute bottom-8 left-6 md:left-12">
            <motion.div
              className="flex items-end gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8, duration: 0.6 }}
            >
              <span className="text-steel text-[10px] tracking-[0.4em] uppercase [writing-mode:vertical-rl] rotate-180">
                SCROLL
              </span>
              <motion.div
                className="w-[1px] h-16 bg-steel origin-top"
                animate={{ scaleY: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          </ScrollParallax>

          {/* Location stamp */}
          <ScrollParallax
            speed={0.5}
            className="absolute top-24 right-6 md:right-12 text-iron text-[10px] tracking-[0.2em] text-right hidden md:block"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.0, duration: 0.5 }}
            >
              <p>48.8566&deg; N</p>
              <p>2.3522&deg; E</p>
              <p className="mt-2 text-steel">2025</p>
            </motion.div>
          </ScrollParallax>
        </section>
      </ScrollZoom>

      {/* Marquee */}
      <Marquee text="DEVELOPER WHO LOVES TO BUILD &mdash; SOLVING REAL PROBLEMS &mdash; CRAFTING THOUGHTFUL DIGITAL EXPERIENCES &mdash; " />

      {/* Selected work */}
      <section className="py-24 md:py-32 px-6 md:px-12 lg:px-24">
        <ScrollReveal>
          <div className="flex justify-between items-end border-b-2 border-bone pb-4 mb-4">
            <h2 className="font-display text-5xl md:text-7xl">
              SELECTED WORK
            </h2>
            <span className="text-ash text-sm">
              ({String(featuredProjects.length).padStart(2, "0")})
            </span>
          </div>
        </ScrollReveal>

        {featuredProjects.map((project, i) => (
          <ProjectCard key={project.id} project={project} index={i} />
        ))}

        <ScrollReveal delay={0.2}>
          <div className="mt-12">
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 text-xs tracking-[0.2em] text-ash hover:text-ember transition-colors border-b border-transparent hover:border-ember pb-1"
            >
              VIEW ALL PROJECTS &rarr;
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* Stats */}
      <section className="py-24 md:py-32 px-6 md:px-12 lg:px-24 border-t border-iron">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 md:gap-8">
          <ScrollCounter value={6} label="PROJECTS SHIPPED" suffix="+" />
          <ScrollCounter value={5} label="YEARS EXPERIENCE" suffix="+" />
          <ScrollCounter value={8} label="TECHNOLOGIES" suffix="+" />
          <ScrollCounter value={24} label="HOUR RESPONSE" suffix="H" />
        </div>
      </section>

      {/* Manifesto */}
      <section className="py-32 md:py-48 px-6 md:px-12 lg:px-24 border-t border-iron">
        <ScrollTextReveal
          text="I BUILD ANYTHING & EVERYTHING. FRONTNED - BACKEND - TOOLS - SYSTEMS. I LOVE SOLVING PROBLEMS, CRAFTING EXPERIENCES, AND CONTINUOUSLY LEARNING."
          mode="word"
          className="font-display text-3xl md:text-5xl lg:text-6xl leading-[1.2] max-w-5xl gap-x-[0.3em]"
          itemClassName="text-bone"
          startOffset="start 75%"
          endOffset="start 15%"
        />
      </section>

      {/* Capabilities */}
      <section className="py-24 md:py-32 px-6 md:px-12 lg:px-24 border-t border-iron">
        <ScrollReveal>
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
        <ScrollReveal>
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
          {recentPosts.map((post, i) => (
            <ScrollReveal key={post.id} delay={i * 0.08}>
              <Link
                href="/blog"
                className="group block border-b border-iron py-6 hover:pl-4 transition-all duration-500"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-8">
                  <div className="flex items-start md:items-center gap-4 md:gap-8 flex-1 min-w-0">
                    <span className="text-steel text-[10px] tracking-[0.15em] shrink-0 pt-1 md:pt-0">
                      {post.date}
                    </span>
                    <h3 className="text-sm md:text-base group-hover:text-ember transition-colors duration-300 truncate">
                      {post.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 md:gap-6 shrink-0 ml-auto">
                    <div className="hidden md:flex gap-2">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] tracking-[0.1em] text-iron"
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
              </Link>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.2}>
          <Link
            href="/blog"
            className="mt-12 inline-flex items-center gap-2 text-xs tracking-[0.2em] text-ash hover:text-ember transition-colors border-b border-transparent hover:border-ember pb-1"
          >
            ALL BLOGS &rarr;
          </Link>
        </ScrollReveal>
      </section>

      {/* About teaser: fade-in is more reliable than scroll-text-reveal near page end. */}
      <section className="py-32 md:py-48 px-6 md:px-12 lg:px-24 border-t border-iron relative">
        <ScrollReveal>
          <p className="font-display text-4xl md:text-6xl lg:text-7xl leading-[1.1] max-w-5xl">
            BUILDING SYSTEMS & SOLUTIONS
            <br />
            <span className="text-ember">THAT ARE FOR EVERYONE.</span>
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.15}>
          <Link
            href="/about"
            className="mt-10 inline-flex items-center gap-2 text-xs tracking-[0.2em] text-ash hover:text-ember transition-colors border-b border-transparent hover:border-ember pb-1"
          >
            MORE ABOUT ME &rarr;
          </Link>
        </ScrollReveal>

        <ScrollParallax
          speed={0.3}
          className="absolute right-6 md:right-12 lg:right-24 top-1/2 -translate-y-1/2 hidden lg:block"
        >
          <span className="text-iron text-[10px] tracking-[0.3em] [writing-mode:vertical-rl]">
            SECTION.08 // ABOUT
          </span>
        </ScrollParallax>
      </section>
    </>
  );
}
