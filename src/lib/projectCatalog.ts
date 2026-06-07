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
import { validateProjectCaseStudyInput } from "@/lib/projectCaseStudy";
import { prisma } from "@/lib/prisma";

type StoredProjectStatus = "LIVE" | "IN_PROGRESS" | "ARCHIVED";
const PROJECT_NUMBER_REGEX = /^[A-Za-z0-9_-]{1,32}$/;
const MAX_TITLE_LENGTH = 180;
const MAX_DESCRIPTION_LENGTH = 5_000;
const MAX_YEAR_LENGTH = 16;
const MAX_TAGS = 16;
const MAX_TAG_LENGTH = 64;
const MAX_URL_LENGTH = 2_048;

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

function parseTags(input: unknown, fallback: string[] = []): string[] {
  if (input === undefined) return fallback;
  if (!Array.isArray(input) || input.length > MAX_TAGS) {
    throw new ProjectCatalogError(`tags must contain at most ${MAX_TAGS} strings`, 400);
  }

  const tags = input.map((tag) => {
    if (typeof tag !== "string" || tag.trim().length > MAX_TAG_LENGTH) {
      throw new ProjectCatalogError(
        `each tag must be a string of at most ${MAX_TAG_LENGTH} characters`,
        400,
      );
    }
    return tag.trim();
  }).filter(Boolean);

  return Array.from(new Set(tags));
}

function parseHttpUrl(
  input: unknown,
  fieldName: string,
): string | undefined {
  if (input === undefined || input === null || input === "") return undefined;
  if (typeof input !== "string" || input.length > MAX_URL_LENGTH) {
    throw new ProjectCatalogError(`${fieldName} is invalid`, 400);
  }

  try {
    const value = input.trim();
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }
    return value;
  } catch {
    throw new ProjectCatalogError(`${fieldName} must use http or https`, 400);
  }
}

function assertCaseStudy(input: unknown): void {
  const validationError = validateProjectCaseStudyInput(input);
  if (validationError) {
    throw new ProjectCatalogError(validationError, 400);
  }
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
  if (!PROJECT_NUMBER_REGEX.test(number)) {
    throw new ProjectCatalogError(
      "number may contain only letters, numbers, underscores, and hyphens",
      400,
    );
  }
  if (title.length > MAX_TITLE_LENGTH) {
    throw new ProjectCatalogError(`title exceeds ${MAX_TITLE_LENGTH} characters`, 400);
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throw new ProjectCatalogError(
      `description exceeds ${MAX_DESCRIPTION_LENGTH} characters`,
      400,
    );
  }

  const year =
    typeof body.year === "string" && body.year.trim()
      ? body.year.trim()
      : new Date().getFullYear().toString();
  if (year.length > MAX_YEAR_LENGTH) {
    throw new ProjectCatalogError(`year exceeds ${MAX_YEAR_LENGTH} characters`, 400);
  }
  assertCaseStudy(body.caseStudy);

  return {
    number,
    title,
    description,
    tags: parseTags(body.tags),
    year,
    url: parseHttpUrl(body.url, "url"),
    github: parseHttpUrl(body.github, "github"),
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
    const number = body.number.trim();
    if (!PROJECT_NUMBER_REGEX.test(number)) {
      throw new ProjectCatalogError("number contains unsupported characters", 400);
    }
    data.number = number;
  }
  if (typeof body.title === "string" && body.title.trim()) {
    const title = body.title.trim();
    if (title.length > MAX_TITLE_LENGTH) {
      throw new ProjectCatalogError(`title exceeds ${MAX_TITLE_LENGTH} characters`, 400);
    }
    data.title = title;
  }
  if (typeof body.description === "string" && body.description.trim()) {
    const description = body.description.trim();
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      throw new ProjectCatalogError(
        `description exceeds ${MAX_DESCRIPTION_LENGTH} characters`,
        400,
      );
    }
    data.description = description;
  }
  if (Object.hasOwn(body, "tags")) {
    data.tags = parseTags(body.tags);
  }
  if (typeof body.year === "string" && body.year.trim()) {
    const year = body.year.trim();
    if (year.length > MAX_YEAR_LENGTH) {
      throw new ProjectCatalogError(`year exceeds ${MAX_YEAR_LENGTH} characters`, 400);
    }
    data.year = year;
  }
  if (Object.hasOwn(body, "url")) {
    data.url = parseHttpUrl(body.url, "url") ?? null;
  }
  if (Object.hasOwn(body, "github")) {
    data.github = parseHttpUrl(body.github, "github") ?? null;
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

  const caseStudyProvided = Object.hasOwn(body, "caseStudy");
  if (caseStudyProvided) assertCaseStudy(body.caseStudy);

  return {
    data,
    caseStudyProvided,
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
