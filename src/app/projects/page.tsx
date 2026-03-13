"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Marquee } from "@/components/Marquee";
import { useSiteSettings } from "@/lib/useSiteSettings";

interface ProjectListItem {
  id: string;
  number: string;
  title: string;
  description: string;
  tags: string[];
  year: string;
  status: "LIVE" | "IN PROGRESS" | "ARCHIVED";
  featured: boolean;
}

function normalizeStatus(status: unknown): ProjectListItem["status"] {
  if (status === "IN PROGRESS" || status === "IN_PROGRESS") return "IN PROGRESS";
  if (status === "ARCHIVED") return "ARCHIVED";
  return "LIVE";
}

const permissionString = (status: string) => {
  switch (status) {
    case "LIVE":
      return "drwxr-xr-x";
    case "IN PROGRESS":
      return "drwxrw----";
    case "ARCHIVED":
      return "dr--r--r--";
    default:
      return "drwxr-xr-x";
  }
};

export default function ProjectsPage() {
  const settings = useSiteSettings();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadProjects = async () => {
      try {
        const res = await fetch("/api/projects", { cache: "no-store" });
        if (!res.ok) return;

        const data = (await res.json()) as unknown;
        if (!Array.isArray(data) || cancelled) return;

        // Keep parsing defensive so malformed rows do not wipe the list.
        const normalized = data
          .map((item: unknown): ProjectListItem | null => {
            if (!item || typeof item !== "object") {
              return null;
            }

            const entry = item as Record<string, unknown>;
            if (
              typeof entry.id !== "string" ||
              typeof entry.title !== "string" ||
              typeof entry.description !== "string" ||
              !Array.isArray(entry.tags) ||
              typeof entry.year !== "string"
            ) {
              return null;
            }

            const tags = entry.tags.filter(
              (tag: unknown): tag is string => typeof tag === "string",
            );
            const number =
              typeof entry.number === "string" && entry.number.trim()
                ? entry.number
                : entry.id;

            return {
              id: entry.id,
              number,
              title: entry.title,
              description: entry.description,
              tags,
              year: entry.year,
              status: normalizeStatus(entry.status),
              featured: Boolean(entry.featured),
            };
          })
          .filter((item): item is ProjectListItem => Boolean(item));

        if (!cancelled) {
          setProjects(normalized);
        }
      } catch {
        // Keep current data on fetch failure.
      }
    };

    loadProjects();
    return () => {
      cancelled = true;
    };
  }, []);

  const { liveCount, inProgressCount, archivedCount } = useMemo(() => {
    let live = 0;
    let inProgress = 0;
    let archived = 0;

    for (const project of projects) {
      if (project.status === "LIVE") {
        live += 1;
      } else if (project.status === "IN PROGRESS") {
        inProgress += 1;
      } else if (project.status === "ARCHIVED") {
        archived += 1;
      }
    }

    return {
      liveCount: live,
      inProgressCount: inProgress,
      archivedCount: archived,
    };
  }, [projects]);

  return (
    <>
      {/* Header */}
      <section className="pt-32 pb-12 px-6 md:px-12 lg:px-24">
        <ScrollReveal>
          <div className="flex items-center gap-3 text-steel text-[10px] tracking-[0.3em] mb-6">
            <span>{settings.siteName}</span>
            <span>/</span>
            <span className="text-ember">PROJECTS</span>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.05}>
          <h1 className="font-display text-6xl md:text-8xl lg:text-9xl tracking-tighter">
            PROJECTS
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <p className="text-ash text-xs md:text-sm mt-4 max-w-xl leading-relaxed">
            A collection of things I&apos;ve built, broken, and shipped. Open any row for a deep dive into the project, including write-ups, concepts, visuals, and demo links.
          </p>
        </ScrollReveal>

        {/* Status summary */}
        <ScrollReveal delay={0.15}>
          <div className="mt-10 flex flex-wrap gap-8 border-t border-b border-iron py-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-400" />
              <span className="text-[10px] tracking-[0.2em] text-ash">
                LIVE ({String(liveCount).padStart(2, "0")})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-400" />
              <span className="text-[10px] tracking-[0.2em] text-ash">
                IN PROGRESS ({String(inProgressCount).padStart(2, "0")})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-steel" />
              <span className="text-[10px] tracking-[0.2em] text-ash">
                ARCHIVED ({String(archivedCount).padStart(2, "0")})
              </span>
            </div>
            <span className="text-[10px] tracking-[0.2em] text-iron ml-auto hidden md:block">
              TOTAL: {String(projects.length).padStart(2, "0")} ENTRIES
            </span>
          </div>
        </ScrollReveal>
      </section>

      {/* Table header */}
      <section className="px-6 md:px-12 lg:px-24 mb-2">
        <ScrollReveal delay={0.2}>
          <div className="hidden md:grid grid-cols-[80px_1fr_120px_100px_80px] gap-4 text-[10px] tracking-[0.2em] text-iron border-b border-iron pb-2">
            <span>PERMS</span>
            <span>NAME</span>
            <span>TAGS</span>
            <span>STATUS</span>
            <span className="text-right">YEAR</span>
          </div>
        </ScrollReveal>
      </section>

      {/* Project listing */}
      <section className="px-6 md:px-12 lg:px-24 pb-24">
        {projects.length === 0 ? (
          <div className="border-b border-iron py-16 text-center">
            <p className="text-iron text-xs tracking-[0.2em]">NO PROJECTS PUBLISHED</p>
          </div>
        ) : (
          projects.map((project, i) => (
            <ScrollReveal key={project.id} delay={i * 0.06}>
              <Link
                href={`/projects/${project.number}`}
                className="group block"
                aria-label={`Open ${project.title} case study`}
              >
                <motion.article
                  className="border-b border-iron py-6 hover:bg-surface transition-colors duration-300"
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Desktop row */}
                  <div className="hidden md:grid grid-cols-[80px_1fr_120px_100px_80px] gap-4 items-center">
                    <span className="text-[10px] text-iron tracking-tight">
                      {permissionString(project.status)}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-baseline gap-3">
                        <span className="text-steel text-[10px] tracking-[0.15em] shrink-0">
                          {project.number}
                          {"//"}
                        </span>
                        <h2 className="font-display text-xl group-hover:text-ember transition-colors duration-300 truncate">
                          {project.title}
                        </h2>
                      </div>
                      <p className="text-ash text-xs mt-1 leading-relaxed line-clamp-1 group-hover:line-clamp-none transition-all">
                        {project.description}
                      </p>
                      <span className="inline-flex mt-2 text-[9px] tracking-[0.18em] text-steel group-hover:text-ember transition-colors">
                        OPEN CASE STUDY &rarr;
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {project.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] tracking-[0.1em] text-smoke border border-iron px-1.5 py-0.5"
                        >
                          {tag}
                        </span>
                      ))}
                      {project.tags.length > 2 && (
                        <span className="text-[9px] text-iron">
                          +{project.tags.length - 2}
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[10px] tracking-[0.15em] px-2 py-0.5 inline-block w-fit ${
                        project.status === "LIVE"
                          ? "text-emerald-400 border border-emerald-400/30"
                          : project.status === "IN PROGRESS"
                            ? "text-amber-400 border border-amber-400/30"
                            : "text-steel border border-iron"
                      }`}
                    >
                      {project.status}
                    </span>

                    <span className="text-[10px] text-steel tracking-[0.2em] text-right">
                      {project.year}
                    </span>
                  </div>

                  {/* Mobile layout */}
                  <div className="md:hidden">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-steel text-[10px] tracking-[0.15em]">
                          {project.number}
                          {"//"}
                        </span>
                        <span className="text-[9px] text-iron tracking-tight">
                          {permissionString(project.status)}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] tracking-[0.1em] px-1.5 py-0.5 ${
                          project.status === "LIVE"
                            ? "text-emerald-400 border border-emerald-400/30"
                            : project.status === "IN PROGRESS"
                              ? "text-amber-400 border border-amber-400/30"
                              : "text-steel border border-iron"
                        }`}
                      >
                        {project.status}
                      </span>
                    </div>

                    <h2 className="font-display text-2xl mb-2 group-hover:text-ember transition-colors">
                      {project.title}
                    </h2>

                    <p className="text-ash text-xs leading-relaxed mb-2">
                      {project.description}
                    </p>
                    <span className="inline-flex mb-3 text-[9px] tracking-[0.18em] text-steel group-hover:text-ember transition-colors">
                      OPEN CASE STUDY &rarr;
                    </span>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {project.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] tracking-[0.1em] text-smoke border border-iron px-1.5 py-0.5"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <span className="text-[10px] text-steel tracking-[0.2em]">
                        {project.year}
                      </span>
                    </div>
                  </div>
                </motion.article>
              </Link>
            </ScrollReveal>
          ))
        )}

        {/* Bottom navigation */}
        <ScrollReveal delay={0.2}>
          <div className="mt-16 flex items-center justify-between">
            <Link
              href="/"
              className="text-xs tracking-[0.2em] text-ash hover:text-ember transition-colors"
            >
              &larr; BACK TO INDEX
            </Link>
            <span className="text-[10px] text-iron tracking-[0.2em]">
              {String(projects.length).padStart(2, "0")} ENTRIES LISTED
            </span>
          </div>
        </ScrollReveal>
      </section>

      {/* Tech marquee */}
{/*       <Marquee
        text="REACT &mdash; NEXT.JS &mdash; TYPESCRIPT &mdash; NODE.JS &mdash; RUST &mdash; WEBGL &mdash; POSTGRESQL &mdash; "
        variant="muted"
        speed={35}
      /> */}
    </>
  );
}
