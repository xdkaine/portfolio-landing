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
import { validateProjectCaseStudyInput, projectCaseStudySettingKey, parseProjectCaseStudy } from "@/lib/projectCaseStudy";
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
  generatedNumber: string,
): CreateProjectInput {
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const number = typeof body.number === "string" && body.number.trim() ? body.number.trim() : generatedNumber;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";

  if (!title || !description) {
    throw new ProjectCatalogError(
      "A project title and summary are required",
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
  return prisma.$transaction(async tx => {
    // Serialize automatic numbering without changing any existing project URLs.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(734021)`;
    const numbers = await tx.project.findMany({ select: { number: true, sortOrder: true } });
    const generatedNumber = String(Math.max(0, ...numbers.map(row => /^\d+$/.test(row.number) ? Number(row.number) : 0)) + 1);
    const data = parseCreateProjectInput(input, Math.max(-1, ...numbers.map(row => row.sortOrder)) + 1, generatedNumber);
    const { caseStudy: details, ...metadata } = data;
    const project = await tx.project.create({ data: metadata });
    const caseStudy = details ? await saveProjectCaseStudy(project.number, details, tx) : null;
    return { ...project, status: normalizeProjectStatus(project.status), caseStudy };
  });
}

export async function updateProject(id: string, input: unknown) {
  const { data, caseStudyProvided, caseStudy } = parseUpdateProjectInput(input);
  return prisma.$transaction(async tx => {
    const existing = await tx.project.findUnique({ where: { id }, select: { number: true, updatedAt: true } });
    if (!existing) return null;
    const expected = (input as Record<string, unknown>).expectedUpdatedAt;
    if (expected !== undefined && expected !== existing.updatedAt.toISOString()) throw new ProjectCatalogError("This project was edited elsewhere. Reload before saving to preserve those changes.", 409);
    const result = await tx.project.updateMany({ where: { id, ...(expected !== undefined ? { updatedAt: existing.updatedAt } : {}) }, data });
    if (!result.count) throw new ProjectCatalogError("This project was edited elsewhere. Reload before saving.", 409);
    const project = await tx.project.findUniqueOrThrow({ where: { id } });
    if (caseStudyProvided) {
      await saveProjectCaseStudy(project.number, caseStudy, tx);
      if (existing.number !== project.number) await deleteProjectCaseStudy(existing.number, tx);
    } else await moveProjectCaseStudy(existing.number, project.number, tx);
    const setting = await tx.siteSetting.findUnique({ where: { key: projectCaseStudySettingKey(project.number) }, select: { value: true } });
    return { ...project, status: normalizeProjectStatus(project.status), caseStudy: parseProjectCaseStudy(setting?.value) };
  });
}

export async function deleteProject(id: string): Promise<boolean> {
  return prisma.$transaction(async tx => {
    const existing = await tx.project.findUnique({ where: { id }, select: { number: true } });
    if (!existing) return false;
    await tx.project.delete({ where: { id } });
    await deleteProjectCaseStudy(existing.number, tx);
    return true;
  });
}

export async function listProjectNavigation() {
  return prisma.project.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { number: "asc" }],
    select: { number: true },
  });
}
