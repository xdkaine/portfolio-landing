import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { ProjectCard } from "@/components/v2/Studio";
import {
  DISCIPLINES,
  listProjects,
  parseProjectQuery,
  ProjectQueryError,
} from "@/lib/v2/catalog";

export const metadata: Metadata = {
  title: "Project library",
  alternates: { canonical: "/v2/work" },
};
export default async function WorkPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const key of ["q", "discipline"]) {
    const value = raw[key];
    if (typeof value === "string") params.set(key, value);
  }
  let validation: string | undefined;
  let query;
  try {
    query = parseProjectQuery(params);
  } catch (error) {
    if (!(error instanceof ProjectQueryError)) throw error;
    validation = error.message;
    query = { q: "", discipline: "All" as const };
  }
  const result = listProjects(query);
  return (
    <div className="v2-container v2-work-page">
      <div className="v2-page-intro">
        <span className="v2-eyebrow">THE PROJECT LIBRARY</span>
        <h1>
          A collection of
          <br />
          <em>working ideas.</em>
        </h1>
        <p>
          Infrastructure, applications, and experiments. Different problems,
          connected by a curiosity about how things work.
        </p>
      </div>
      <form
        className="v2-library-search"
        action="/v2/work"
        method="get"
        role="search"
      >
        <div>
          <label htmlFor="v2-search">Search projects</label>
          <div className="v2-search-input">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              id="v2-search"
              name="q"
              defaultValue={query.q}
              placeholder="Try Proxmox, LDAP, or Swift…"
              maxLength={120}
            />
          </div>
        </div>
        <div>
          <label htmlFor="v2-discipline">Discipline</label>
          <select
            id="v2-discipline"
            name="discipline"
            defaultValue={query.discipline}
          >
            {DISCIPLINES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="v2-button">
          Find projects <ArrowUpRight size={17} aria-hidden="true" />
        </button>
      </form>
      {validation && <p role="alert">{validation}</p>}
      <div className="v2-results-meta">
        <span>
          {String(result.total).padStart(2, "0")} PROJECT
          {result.total === 1 ? "" : "S"}
          {query.q ? ` MATCHING “${query.q}”` : " IN THE COLLECTION"}
        </span>
        {(query.q || query.discipline !== "All") && (
          <Link href="/v2/work">Clear filters ↗</Link>
        )}
      </div>
      {result.items.length ? (
        <div className="v2-project-grid">
          {result.items.map((project) => (
            <ProjectCard project={project} key={project.slug} />
          ))}
        </div>
      ) : (
        <div className="v2-empty">
          <h2>No projects found.</h2>
          <p>Try another technology or broaden the discipline filter.</p>
          <Link className="v2-inline-link" href="/v2/work">
            Show the full collection{" "}
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </div>
      )}
    </div>
  );
}
