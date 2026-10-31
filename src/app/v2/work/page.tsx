import type { Metadata } from "next";
import Link from "next/link";
import { ProjectRow, WritingRow } from "@/components/v2/Studio";
import { DISCIPLINES, listProjects, ProjectQueryError, type Discipline } from "@/lib/v2/catalog";
import { parseLibraryQuery, type LibraryQuery } from "@/lib/v2/library";
import { loadLibrary } from "@/lib/v2/libraryServer";
import { WritingUnavailableError } from "@/lib/v2/writing";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Projects & writing", alternates: { canonical: "/v2/work" } };

export default async function WorkPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const key of ["q", "discipline", "kind"]) if (typeof raw[key] === "string") params.set(key, raw[key]);
  let validation: string | undefined;
  let query: LibraryQuery;
  try { query = parseLibraryQuery(params); }
  catch (error) {
    if (!(error instanceof ProjectQueryError)) throw error;
    validation = error.message;
    query = { q: (params.get("q") ?? "").trim().slice(0, 120),
      discipline: DISCIPLINES.includes(params.get("discipline") as Discipline) ? params.get("discipline") as Discipline : "All",
      kind: ["all", "projects", "writing"].includes(params.get("kind") ?? "") ? params.get("kind") as LibraryQuery["kind"] : "all" };
  }
  let writingUnavailable = false;
  let result;
  try { result = await loadLibrary(query); }
  catch (error) {
    if (!(error instanceof WritingUnavailableError)) throw error;
    writingUnavailable = true;
    const projects = query.kind === "writing" ? { items: [], total: 0 } : listProjects(query);
    result = { projects, writing: { items: [], total: 0 }, total: projects.total };
  }
  return (
    <div className="v2-container v2-work-page">
      <div className="v2-page-intro"><h1>Projects &amp; writing</h1><p>Software, infrastructure builds, and the notes behind them.</p></div>
      <form className="v2-library-search v2-combined-search" action="/v2/work" method="get" role="search">
        <div><label htmlFor="v2-search">Search work</label><input type="search" id="v2-search" name="q" defaultValue={query.q} placeholder="Project, article, or technology" maxLength={120} /></div>
        <div><label htmlFor="v2-kind">Show</label><select id="v2-kind" name="kind" defaultValue={query.kind}>
          <option value="all">Projects &amp; writing</option><option value="projects">Projects</option><option value="writing">Writing</option>
        </select></div>
        <div><label htmlFor="v2-discipline">Discipline</label><select id="v2-discipline" name="discipline" defaultValue={query.discipline}>{DISCIPLINES.map(item => <option key={item}>{item}</option>)}</select></div>
        <button type="submit" className="v2-button">Find</button>
      </form>
      {validation && <p className="v2-validation" role="alert">{validation}</p>}
      <div className="v2-results-meta">
        <span>{writingUnavailable ? "Project results shown; writing unavailable" : `${result.total} ${result.total === 1 ? "entry" : "entries"}`}{query.q ? ` matching “${query.q}”` : ""}</span>
        {(query.q || query.discipline !== "All" || query.kind !== "all") && <Link href="/v2/work">Clear filters</Link>}
      </div>
      {query.kind !== "writing" && result.projects.items.length > 0 && <section aria-labelledby="project-results-title" className="v2-library-group">
        <h2 id="project-results-title">Projects</h2><div className="v2-project-index">{result.projects.items.map(project => <ProjectRow key={project.slug} project={project} />)}</div>
      </section>}
      {query.kind !== "projects" && <section aria-labelledby="writing-results-title" className="v2-library-group">
        <h2 id="writing-results-title">Writing</h2>
        {writingUnavailable ? <p className="v2-availability" role="status">Writing is temporarily unavailable. Projects remain available. <Link href="/v2/work?kind=projects">Browse projects</Link>.</p>
          : result.writing.items.length > 0 ? <div className="v2-writing-index">{result.writing.items.map(post => <WritingRow key={post.slug} post={post} />)}</div>
            : <p className="v2-availability">{query.q || query.discipline !== "All" ? "No writing matches these filters." : "No published writing yet."}</p>}
      </section>}
      {result.total === 0 && !writingUnavailable && <div className="v2-empty"><h2>No matching entries.</h2><p>Try another subject or a broader discipline.</p><Link href="/v2/work">Show the full library</Link></div>}
    </div>
  );
}
