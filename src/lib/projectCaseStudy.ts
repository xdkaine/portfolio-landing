export interface ProjectCaseStudyGalleryItem {
  title: string;
  caption: string;
  image: string;
  alt: string;
}

export interface ProjectCaseStudyViewModel {
  subtitle: string;
  role: string;
  timeline: string;
  challenge?: string;
  concept?: string;
  writeup: string[];
  highlights: string[];
  demoSummary?: string;
  demoUrl?: string;
  repoUrl?: string;
  gallery: ProjectCaseStudyGalleryItem[];
}

export interface ProjectCaseStudyContent {
  subtitle?: string;
  // Backward compatibility for older records.
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
  gallery?: ProjectCaseStudyGalleryItem[];
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

function normalizeGallery(
  value: unknown,
): ProjectCaseStudyGalleryItem[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const items = value
    .map((entry, index): ProjectCaseStudyGalleryItem | null => {
      if (!entry || typeof entry !== "object") return null;
      const item = entry as Record<string, unknown>;
      const image = normalizeString(item.image);
      if (!image) return null;

      const title = normalizeString(item.title) ?? `VISUAL NOTE ${index + 1}`;
      const caption = normalizeString(item.caption) ?? "";
      const alt = normalizeString(item.alt) ?? title;
      return { title, caption, image, alt };
    })
    .filter((entry): entry is ProjectCaseStudyGalleryItem => Boolean(entry));

  return items.length > 0 ? items : undefined;
}

export function normalizeProjectCaseStudyInput(
  value: unknown,
): ProjectCaseStudyContent | null {
  if (!value || typeof value !== "object") return null;

  const data = value as Record<string, unknown>;
  const subtitle = normalizeString(data.subtitle) ?? normalizeString(data.pitch);
  const normalized: ProjectCaseStudyContent = {
    subtitle,
    pitch: subtitle,
    role: normalizeString(data.role),
    timeline: normalizeString(data.timeline),
    challenge: normalizeString(data.challenge),
    concept: normalizeString(data.concept),
    writeup: normalizeWriteup(data.writeup),
    highlights: normalizeHighlights(data.highlights),
    demoSummary: normalizeString(data.demoSummary),
    demoUrl: normalizeString(data.demoUrl),
    repoUrl: normalizeString(data.repoUrl),
    gallery: normalizeGallery(data.gallery),
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
  base: ProjectCaseStudyViewModel,
  override: ProjectCaseStudyContent | null,
): ProjectCaseStudyViewModel {
  if (!override) return base;

  return {
    ...base,
    subtitle: override.subtitle ?? override.pitch ?? base.subtitle,
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
    gallery:
      override.gallery && override.gallery.length > 0
        ? override.gallery
        : base.gallery,
  };
}
