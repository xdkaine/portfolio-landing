import type { ProjectDeepDive } from "@/data/projectDeepDives";

export interface ProjectCaseStudyContent {
  pitch?: string;
  role?: string;
  timeline?: string;
  challenge?: string;
  concept?: string;
  writeup?: string[];
  highlights?: string[];
  demoSummary?: string;
  demoUrl?: string;
  repoUrl?: string;
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeWriteup(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const paragraphs = value
      .map((item) => normalizeString(item))
      .filter((item): item is string => Boolean(item));
    return paragraphs.length > 0 ? paragraphs : undefined;
  }

  if (typeof value === "string") {
    const paragraphs = value
      .split(/\n\s*\n/g)
      .map((item) => item.trim())
      .filter(Boolean);
    return paragraphs.length > 0 ? paragraphs : undefined;
  }

  return undefined;
}

function normalizeHighlights(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const items = value
      .map((item) => normalizeString(item))
      .filter((item): item is string => Boolean(item));
    return items.length > 0 ? items : undefined;
  }

  if (typeof value === "string") {
    const items = value
      .split(/\n|,/g)
      .map((item) => item.trim())
      .filter(Boolean);
    return items.length > 0 ? items : undefined;
  }

  return undefined;
}

export function normalizeProjectCaseStudyInput(
  value: unknown,
): ProjectCaseStudyContent | null {
  if (!value || typeof value !== "object") return null;

  const data = value as Record<string, unknown>;
  const normalized: ProjectCaseStudyContent = {
    pitch: normalizeString(data.pitch),
    role: normalizeString(data.role),
    timeline: normalizeString(data.timeline),
    challenge: normalizeString(data.challenge),
    concept: normalizeString(data.concept),
    writeup: normalizeWriteup(data.writeup),
    highlights: normalizeHighlights(data.highlights),
    demoSummary: normalizeString(data.demoSummary),
    demoUrl: normalizeString(data.demoUrl),
    repoUrl: normalizeString(data.repoUrl),
  };

  const hasValue = Object.values(normalized).some((field) => {
    if (Array.isArray(field)) return field.length > 0;
    return Boolean(field);
  });

  return hasValue ? normalized : null;
}

export function parseProjectCaseStudy(
  rawValue: string | null | undefined,
): ProjectCaseStudyContent | null {
  if (!rawValue) return null;

  try {
    return normalizeProjectCaseStudyInput(JSON.parse(rawValue));
  } catch {
    return null;
  }
}

export function serializeProjectCaseStudy(
  value: ProjectCaseStudyContent,
): string {
  return JSON.stringify(value);
}

export function projectCaseStudySettingKey(projectNumber: string): string {
  return `project_case_${projectNumber}`;
}

export function mergeProjectCaseStudy(
  base: ProjectDeepDive,
  override: ProjectCaseStudyContent | null,
): ProjectDeepDive {
  if (!override) return base;

  return {
    ...base,
    pitch: override.pitch ?? base.pitch,
    role: override.role ?? base.role,
    timeline: override.timeline ?? base.timeline,
    challenge: override.challenge ?? base.challenge,
    concept: override.concept ?? base.concept,
    writeup:
      override.writeup && override.writeup.length > 0
        ? override.writeup
        : base.writeup,
    highlights:
      override.highlights && override.highlights.length > 0
        ? override.highlights
        : base.highlights,
    demoSummary: override.demoSummary ?? base.demoSummary,
    demoUrl: override.demoUrl ?? base.demoUrl,
    repoUrl: override.repoUrl ?? base.repoUrl,
  };
}
