import {
  DISCIPLINES,
  listProjects,
  parseProjectQuery,
  ProjectQueryError,
  type Discipline,
  type Project,
} from "@/lib/v2/catalog";
import type { WritingList, WritingSummary } from "@/lib/v2/writing";

export const LIBRARY_KINDS = ["all", "projects", "writing"] as const;
export type LibraryKind = typeof LIBRARY_KINDS[number];
export type LibraryQuery = { q: string; discipline: Discipline; kind: LibraryKind };
export type LibraryResult = {
  projects: { items: Project[]; total: number };
  writing: { items: WritingSummary[]; total: number };
  total: number;
  query: LibraryQuery;
  disciplines: typeof DISCIPLINES;
  kinds: typeof LIBRARY_KINDS;
};

export function parseLibraryQuery(params: URLSearchParams): LibraryQuery {
  const query = parseProjectQuery(params);
  const kind = params.get("kind") || "all";
  if (!LIBRARY_KINDS.includes(kind as LibraryKind)) {
    throw new ProjectQueryError("Choose projects, writing, or all work.");
  }
  return { ...query, kind: kind as LibraryKind };
}

export function createLibraryLoader(
  listWriting: (query: { q: string; discipline: Discipline }) => Promise<WritingList>,
) {
  return async function loadLibrary(query: LibraryQuery): Promise<LibraryResult> {
    const projects = query.kind === "writing" ? { items: [], total: 0 } : listProjects(query);
    const writing = query.kind === "projects" ? { items: [], total: 0 } : await listWriting(query);
    return {
      projects: { items: projects.items, total: projects.total },
      writing: { items: writing.items, total: writing.total },
      total: projects.total + writing.total,
      query,
      disciplines: DISCIPLINES,
      kinds: LIBRARY_KINDS,
    };
  };
}
