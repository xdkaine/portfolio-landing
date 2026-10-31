import type { Metadata } from "next";
import Link from "next/link";
import { ProjectRow } from "@/components/v2/Studio";
import { DISCIPLINES, listProjects, parseProjectQuery, ProjectQueryError, type Discipline } from "@/lib/v2/catalog";

export const metadata: Metadata = { title: "Projects", alternates: { canonical: "/v2/work" } };

export default async function WorkPage({ searchParams }: {
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
    const discipline = params.get("discipline") as Discipline;
    query = { q: (params.get("q") ?? "").trim().slice(0, 120),
      discipline: DISCIPLINES.includes(discipline) ? discipline : "All" as const };
  }
  const result = listProjects(query);
  return (
    <div className="v2-container v2-work-page">
      <div className="v2-page-intro">
        <h1>Projects</h1>
        <p>Infrastructure, applications, and experiments. Uma and UAR have case studies; the other entries are shorter project notes.</p>
      </div>
      <form className="v2-library-search" action="/v2/work" method="get" role="search">
        <div>
          <label htmlFor="v2-search">Search projects</label>
          <input type="search" id="v2-search" name="q" defaultValue={query.q}
            placeholder="Project, technology, or subject" maxLength={120} />
        </div>
        <div>
          <label htmlFor="v2-discipline">Discipline</label>
          <select id="v2-discipline" name="discipline" defaultValue={query.discipline}>
            {DISCIPLINES.map(item => <option key={item}>{item}</option>)}
          </select>
        </div>
        <button type="submit" className="v2-button">Find projects</button>
      </form>
      {validation && <p className="v2-validation" role="alert">{validation}</p>}
      <div className="v2-results-meta">
        <span>{result.total} {result.total === 1 ? "project" : "projects"}{query.q ? ` matching “${query.q}”` : ""}</span>
        {(query.q || query.discipline !== "All") && <Link href="/v2/work">Clear filters</Link>}
      </div>
      {result.items.length ? (
        <div className="v2-project-index">
          {result.items.map(project => <ProjectRow key={project.slug} project={project} titleLevel={2} />)}
        </div>
      ) : (
        <div className="v2-empty">
          <h2>No projects found.</h2>
          <p>Try another technology or choose a broader discipline.</p>
          <Link href="/v2/work">Show all projects</Link>
        </div>
      )}
    </div>
  );
}
