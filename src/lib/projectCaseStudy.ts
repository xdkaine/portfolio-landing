import { normalizeV1PublicUrl } from "@/lib/v1Path";

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
  writeupMarkdown: string;
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
  writeupMarkdown?: string;
  writeup?: string[];
  highlights?: string[];
  demoSummary?: string;
  demoUrl?: string;
  repoUrl?: string;
  gallery?: ProjectCaseStudyGalleryItem[];
}

const MAX_CASE_STUDY_BYTES = 100_000;
const MAX_WRITEUP_LENGTH = 50_000;
const MAX_SHORT_TEXT_LENGTH = 500;
const MAX_HIGHLIGHTS = 30;
const MAX_GALLERY_ITEMS = 20;
const MAX_URL_LENGTH = 2_048;
const SAFE_PROJECT_ASSET_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SAFE_PROJECT_ASSET_EXTENSION = /\.(?:avif|gif|jpe?g|png|svg|webp)$/i;
const SAFE_UPLOADED_PROJECT_IMAGE =
  /^\/(?:v1\/)?uploads\/projects\/[A-Za-z0-9][A-Za-z0-9._-]*\.(?:gif|jpe?g|png|webp)$/i;

export function isSafeProjectExternalUrl(value: string): boolean {
  if (value.length > MAX_URL_LENGTH) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isSafeCheckedInProjectAsset(value: string): boolean {
  const prefix = value.startsWith("/v1/assets/projects/")
    ? "/v1/assets/projects/"
    : "/projects/";
  if (!value.startsWith(prefix) || !SAFE_PROJECT_ASSET_EXTENSION.test(value)) {
    return false;
  }

  const segments = value.slice(prefix.length).split("/");
  return (
    segments.length > 0 &&
    segments.every(
      (segment) =>
        segment !== "." &&
        segment !== ".." &&
        SAFE_PROJECT_ASSET_SEGMENT.test(segment),
    )
  );
}

export function isSafeProjectImage(value: string): boolean {
  return (
    SAFE_UPLOADED_PROJECT_IMAGE.test(value) ||
    isSafeCheckedInProjectAsset(value) ||
    isSafeProjectExternalUrl(value)
  );
}

export function transformProjectMarkdownUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("#")) return trimmed;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return normalizeV1PublicUrl(trimmed);
  }
  if (trimmed.startsWith("mailto:") || trimmed.startsWith("tel:")) return trimmed;
  return isSafeProjectExternalUrl(trimmed) ? trimmed : "";
}

export function validateProjectCaseStudyInput(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "Project case study must be an object";
  }

  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    return "Project case study must be serializable";
  }
  if (new TextEncoder().encode(serialized).byteLength > MAX_CASE_STUDY_BYTES) {
    return "Project case study exceeds the 100 KB limit";
  }

  const data = value as Record<string, unknown>;
  for (const name of [
    "subtitle",
    "pitch",
    "role",
    "timeline",
    "challenge",
    "concept",
    "demoSummary",
  ]) {
    const field = data[name];
    if (typeof field === "string" && field.length > MAX_SHORT_TEXT_LENGTH) {
      return `${name} exceeds ${MAX_SHORT_TEXT_LENGTH} characters`;
    }
  }

  if (
    typeof data.writeupMarkdown === "string" &&
    data.writeupMarkdown.length > MAX_WRITEUP_LENGTH
  ) {
    return `writeupMarkdown exceeds ${MAX_WRITEUP_LENGTH} characters`;
  }
  if (Array.isArray(data.writeup) && data.writeup.length > 100) {
    return "writeup contains too many paragraphs";
  }
  if (Array.isArray(data.highlights) && data.highlights.length > MAX_HIGHLIGHTS) {
    return `highlights contains more than ${MAX_HIGHLIGHTS} entries`;
  }
  if (Array.isArray(data.gallery) && data.gallery.length > MAX_GALLERY_ITEMS) {
    return `gallery contains more than ${MAX_GALLERY_ITEMS} entries`;
  }

  for (const name of ["demoUrl", "repoUrl"]) {
    const field = data[name];
    if (
      typeof field === "string" &&
      field.trim() &&
      !isSafeProjectExternalUrl(field.trim())
    ) {
      return `${name} must use http or https`;
    }
  }

  if (Array.isArray(data.gallery)) {
    for (const entry of data.gallery) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return "gallery entries must be objects";
      }
      const image = (entry as Record<string, unknown>).image;
      if (
        typeof image !== "string" ||
        !image.trim() ||
        !isSafeProjectImage(image.trim())
      ) {
        return "gallery images must use an uploaded project path or http(s) URL";
      }
    }
  }

  return null;
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

function normalizeWriteupMarkdown(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (Array.isArray(value)) {
    const paragraphs = normalizeWriteup(value);
    return paragraphs && paragraphs.length > 0
      ? paragraphs.join("\n\n")
      : undefined;
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
      if (!image || !isSafeProjectImage(image)) return null;

      const title = normalizeString(item.title) ?? `VISUAL NOTE ${index + 1}`;
      const caption = normalizeString(item.caption) ?? "";
      const alt = normalizeString(item.alt) ?? title;
      return {
        title,
        caption,
        image: normalizeV1PublicUrl(image),
        alt,
      };
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
  const writeup = normalizeWriteup(data.writeup);
  const writeupMarkdown =
    normalizeWriteupMarkdown(data.writeupMarkdown) ??
    (writeup && writeup.length > 0 ? writeup.join("\n\n") : undefined);
  const demoUrl = normalizeString(data.demoUrl);
  const repoUrl = normalizeString(data.repoUrl);
  const normalized: ProjectCaseStudyContent = {
    subtitle,
    pitch: subtitle,
    role: normalizeString(data.role),
    timeline: normalizeString(data.timeline),
    challenge: normalizeString(data.challenge),
    concept: normalizeString(data.concept),
    writeupMarkdown,
    writeup,
    highlights: normalizeHighlights(data.highlights),
    demoSummary: normalizeString(data.demoSummary),
    demoUrl:
      demoUrl && isSafeProjectExternalUrl(demoUrl) ? demoUrl : undefined,
    repoUrl:
      repoUrl && isSafeProjectExternalUrl(repoUrl) ? repoUrl : undefined,
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

  const overrideWriteup =
    override.writeup && override.writeup.length > 0
      ? override.writeup
      : normalizeWriteup(override.writeupMarkdown) ?? base.writeup;
  const overrideWriteupMarkdown =
    override.writeupMarkdown ??
    (override.writeup && override.writeup.length > 0
      ? override.writeup.join("\n\n")
      : base.writeupMarkdown);

  return {
    ...base,
    subtitle: override.subtitle ?? override.pitch ?? base.subtitle,
    role: override.role ?? base.role,
    timeline: override.timeline ?? base.timeline,
    challenge: override.challenge ?? base.challenge,
    concept: override.concept ?? base.concept,
    writeupMarkdown: overrideWriteupMarkdown,
    writeup: overrideWriteup,
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
