import "server-only";

import type { Project } from "@/generated/prisma/client";
import {
  getProjectCaseStudy,
  listProjectCaseStudiesByNumber,
  moveProjectCaseStudy,
  saveProjectCaseStudy,
  deleteProjectCaseStudy,
} from "@/lib/projectCaseStudyStore";
import {
  normalizeProjectStatus,
  type DisplayProjectStatus,
} from "@/lib/projectPresentation";
import { prisma } from "@/lib/prisma";

type StoredProjectStatus = "LIVE" | "IN_PROGRESS" | "ARCHIVED";

export class ProjectCatalogError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ProjectCatalogError";
  }
}

export type ProjectWithCaseStudy = Omit<Project, "status"> & {
  status: DisplayProjectStatus;
  caseStudy: Awaited<ReturnType<typeof getProjectCaseStudy>>;
};

interface CreateProjectInput {
  number: string;
  title: string;
  description: string;
  tags: string[];
  year: string;
  url?: string;
  github?: string;
  status: StoredProjectStatus;
  featured: boolean;
  sortOrder: number;
  caseStudy?: unknown;
}

interface UpdateProjectInput {
  number?: string;
  title?: string;
  description?: string;
  tags?: string[];
  year?: string;
  url?: string | null;
  github?: string | null;
  status?: StoredProjectStatus;
  featured?: boolean;
  sortOrder?: number;
}

function toStoredProjectStatus(status: unknown): StoredProjectStatus | undefined {
  const normalized = status === "IN PROGRESS" ? "IN_PROGRESS" : status;
  if (
    normalized === "LIVE" ||
    normalized === "IN_PROGRESS" ||
    normalized === "ARCHIVED"
  ) {
    return normalized;
  }
  return undefined;
}

function normalizeTags(input: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(input)) return fallback;
  if (!input.every((tag) => typeof tag === "string")) return fallback;
  return input.map((tag) => tag.trim()).filter(Boolean);
}

function normalizeSortOrder(input: unknown): number | null {
  return typeof input === "number" && Number.isFinite(input)
    ? Math.max(0, Math.trunc(input))
    : null;
}

function parseCreateProjectInput(
  input: unknown,
  resolvedSortOrder: number,
): CreateProjectInput {
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const number = typeof body.number === "string" ? body.number.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";

  if (!number || !title || !description) {
    throw new ProjectCatalogError(
      "number, title, and description are required",
      400,
    );
  }

  return {
    number,
    title,
    description,
    tags: normalizeTags(body.tags),
    year:
      typeof body.year === "string" && body.year.trim()
        ? body.year.trim()
        : new Date().getFullYear().toString(),
    url: typeof body.url === "string" ? body.url.trim() || undefined : undefined,
    github:
      typeof body.github === "string"
        ? body.github.trim() || undefined
        : undefined,
    status: toStoredProjectStatus(body.status) ?? "LIVE",
    featured: body.featured === true,
    sortOrder: normalizeSortOrder(body.sortOrder) ?? resolvedSortOrder,
    caseStudy: body.caseStudy,
  };
}

function parseUpdateProjectInput(input: unknown): {
  data: UpdateProjectInput;
  caseStudyProvided: boolean;
  caseStudy: unknown;
} {
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const data: UpdateProjectInput = {};

  if (typeof body.number === "string" && body.number.trim()) {
    data.number = body.number.trim();
  }
  if (typeof body.title === "string" && body.title.trim()) {
    data.title = body.title.trim();
  }
  if (typeof body.description === "string" && body.description.trim()) {
    data.description = body.description.trim();
  }
  if (Array.isArray(body.tags) && body.tags.every((tag) => typeof tag === "string")) {
    data.tags = normalizeTags(body.tags);
  }
  if (typeof body.year === "string" && body.year.trim()) {
    data.year = body.year.trim();
  }
  if (typeof body.url === "string") {
    data.url = body.url.trim() || null;
  }
  if (typeof body.github === "string") {
    data.github = body.github.trim() || null;
  }

  const status = toStoredProjectStatus(body.status);
  if (status) {
    data.status = status;
  }
  if (typeof body.featured === "boolean") {
    data.featured = body.featured;
  }

  const sortOrder = normalizeSortOrder(body.sortOrder);
  if (sortOrder !== null) {
    data.sortOrder = sortOrder;
  }

  return {
    data,
    caseStudyProvided: Object.hasOwn(body, "caseStudy"),
    caseStudy: body.caseStudy,
  };
}

async function nextProjectSortOrder(): Promise<number> {
  const aggregate = await prisma.project.aggregate({
    _max: { sortOrder: true },
  });
  return (aggregate._max.sortOrder ?? -1) + 1;
}

async function attachCaseStudy(project: Project): Promise<ProjectWithCaseStudy> {
  return {
    ...project,
    status: normalizeProjectStatus(project.status),
    caseStudy: await getProjectCaseStudy(project.number),
  };
}

export async function listProjects(): Promise<ProjectWithCaseStudy[]> {
  const projects = await prisma.project.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { number: "asc" }],
  });
  const caseStudies = await listProjectCaseStudiesByNumber(
    projects.map((project) => project.number),
  );

  return projects.map((project) => ({
    ...project,
    status: normalizeProjectStatus(project.status),
    caseStudy: caseStudies.get(project.number) ?? null,
  }));
}

export async function getProjectByIdOrNumber(idOrNumber: string) {
  const project =
    (await prisma.project.findUnique({ where: { id: idOrNumber } })) ??
    (await prisma.project.findUnique({ where: { number: idOrNumber } }));

  return project ? attachCaseStudy(project) : null;
}

export async function createProject(input: unknown) {
  const data = parseCreateProjectInput(input, await nextProjectSortOrder());
  const project = await prisma.project.create({
    data: {
      number: data.number,
      title: data.title,
      description: data.description,
      tags: data.tags,
      year: data.year,
      url: data.url,
      github: data.github,
      status: data.status,
      featured: data.featured,
      sortOrder: data.sortOrder,
    },
  });

  const caseStudy = data.caseStudy
    ? await saveProjectCaseStudy(project.number, data.caseStudy)
    : null;

  return {
    ...project,
    status: normalizeProjectStatus(project.status),
    caseStudy,
  };
}

export async function updateProject(id: string, input: unknown) {
  const { data, caseStudyProvided, caseStudy } = parseUpdateProjectInput(input);
  const existing = await prisma.project.findUnique({
    where: { id },
    select: { number: true },
  });
  if (!existing) return null;

  const project = await prisma.project.update({ where: { id }, data });

  if (caseStudyProvided) {
    await saveProjectCaseStudy(project.number, caseStudy);
    if (existing.number !== project.number) {
      await deleteProjectCaseStudy(existing.number);
    }
  } else {
    await moveProjectCaseStudy(existing.number, project.number);
  }

  return attachCaseStudy(project);
}

export async function deleteProject(id: string): Promise<boolean> {
  const existing = await prisma.project.findUnique({
    where: { id },
    select: { number: true },
  });
  if (!existing) return false;

  await prisma.project.delete({ where: { id } });
  await deleteProjectCaseStudy(existing.number);
  return true;
}

export async function listProjectNavigation() {
  return prisma.project.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { number: "asc" }],
    select: { number: true },
  });
}
