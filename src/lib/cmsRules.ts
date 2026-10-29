import {
  hasPostBody,
  missingImageAltCount,
  normalizePostDocument,
} from "./postContent";
export class CmsError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "CmsError";
  }
}
export function requireVersion(input: unknown): number {
  const version =
    input && typeof input === "object"
      ? (input as Record<string, unknown>).version
      : undefined;
  if (
    typeof version !== "number" ||
    !Number.isSafeInteger(version) ||
    version < 1
  )
    throw new CmsError(
      "A current record version is required. Reload this record before saving.",
      428,
    );
  return version;
}
export const MESSAGE_STATUSES = [
  "NEW",
  "OPEN",
  "RESOLVED",
  "ARCHIVED",
] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];
export function parseMessageUpdate(input: unknown) {
  if (!input || typeof input !== "object")
    throw new CmsError("No valid changes supplied.");
  const body = input as Record<string, unknown>;
  const changes: { status?: MessageStatus; read?: boolean; note?: string } = {};
  if ("status" in body) {
    if (!MESSAGE_STATUSES.includes(body.status as MessageStatus))
      throw new CmsError("Invalid message status.");
    changes.status = body.status as MessageStatus;
  }
  if ("read" in body) {
    if (typeof body.read !== "boolean")
      throw new CmsError("Read must be true or false.");
    changes.read = body.read;
  }
  if ("note" in body) {
    if (typeof body.note !== "string" || body.note.length > 4000)
      throw new CmsError("Internal notes must be at most 4,000 characters.");
    changes.note = body.note.trim();
  }
  if (!Object.keys(changes).length)
    throw new CmsError("No valid changes supplied.");
  return changes;
}
export function publicationIssues(post: {
  title: string;
  slug: string;
  excerpt: string;
  bodyJson?: unknown;
  content?: string | null;
  coverImage?: string | null;
  coverAlt?: string | null;
}) {
  const issues: string[] = [];
  if (!post.title.trim()) issues.push("Add a title");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug))
    issues.push("Use a valid URL slug");
  if (!post.excerpt.trim()) issues.push("Add an excerpt");
  const document = normalizePostDocument(post.bodyJson);
  if (!hasPostBody(document) && !post.content?.trim())
    issues.push("Write article content");
  if (missingImageAltCount(document) > 0)
    issues.push("Add alt text to every article image");
  if (post.coverImage && !post.coverAlt?.trim())
    issues.push("Describe the cover image");
  return issues;
}
