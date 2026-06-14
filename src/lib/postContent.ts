import { normalizeV1PublicUrl } from "@/lib/v1Path";

export type PostMark = {
  type: "bold" | "italic" | "strike" | "code" | "link";
  attrs?: { href: string; target?: "_blank"; rel?: string };
};

export type PostNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PostNode[];
  marks?: PostMark[];
  text?: string;
};

export interface PostDocument {
  type: "doc";
  content?: PostNode[];
}

export interface PostHeading {
  id: string;
  level: number;
  text: string;
}

export const EMPTY_POST_DOCUMENT: PostDocument = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

const SLUG_PARTS_REGEX = /[^a-z0-9]+/g;
const WORD_REGEX = /\S+/g;
const SAFE_INTERNAL_MEDIA_REGEX =
  /^\/(?:v1\/)?uploads\/posts\/[A-Za-z0-9._-]+$/;
const ALLOWED_BLOCK_NODES = new Set([
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "horizontalRule",
  "codeBlock",
  "image",
]);
const ALLOWED_INLINE_NODES = new Set(["text", "hardBreak", "image"]);
const ALLOWED_MARKS = new Set(["bold", "italic", "strike", "code", "link"]);

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function createPostSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(SLUG_PARTS_REGEX, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function isSafePostMediaSource(value: string): boolean {
  if (SAFE_INTERNAL_MEDIA_REGEX.test(value)) return true;

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function isSafeArticleHref(value: string): boolean {
  if (value.startsWith("/") || value.startsWith("#")) return true;

  try {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:" || protocol === "mailto:";
  } catch {
    return false;
  }
}

function normalizeMarks(input: unknown): PostMark[] | undefined {
  if (!Array.isArray(input)) return undefined;

  const marks = input.flatMap((entry): PostMark[] => {
    const mark = objectValue(entry);
    const type = typeof mark?.type === "string" ? mark.type : "";
    if (!ALLOWED_MARKS.has(type)) return [];
    if (type !== "link") return [{ type: type as PostMark["type"] }];

    const attrs = objectValue(mark?.attrs);
    const href = typeof attrs?.href === "string" ? attrs.href.trim() : "";
    if (!href || !isSafeArticleHref(href)) return [];
    return [{
      type: "link",
      attrs: {
        href,
        target: "_blank",
        rel: "noopener noreferrer",
      },
    }];
  });

  return marks.length > 0 ? marks : undefined;
}

function normalizeNode(input: unknown, inline = false): PostNode | null {
  const node = objectValue(input);
  const type = typeof node?.type === "string" ? node.type : "";
  const allowedNodes = inline ? ALLOWED_INLINE_NODES : ALLOWED_BLOCK_NODES;

  if (!allowedNodes.has(type)) return null;

  if (type === "text") {
    if (typeof node?.text !== "string") return null;
    return { type, text: node.text, marks: normalizeMarks(node.marks) };
  }

  if (type === "hardBreak" || type === "horizontalRule") {
    return { type };
  }

  if (type === "image") {
    const attrs = objectValue(node?.attrs);
    const src = typeof attrs?.src === "string" ? attrs.src.trim() : "";
    if (!src || !isSafePostMediaSource(src)) return null;

    return {
      type,
      attrs: {
        src: normalizeV1PublicUrl(src),
        alt: typeof attrs?.alt === "string" ? attrs.alt.trim() : "",
        caption: typeof attrs?.caption === "string" ? attrs.caption.trim() : "",
      },
    };
  }

  const rawChildren = Array.isArray(node?.content) ? node.content : [];
  const children = rawChildren
    .map((child) => normalizeNode(
      child,
      type === "paragraph" || type === "heading" || type === "codeBlock",
    ))
    .filter((child): child is PostNode => child !== null);

  if (type === "heading") {
    const attrs = objectValue(node?.attrs);
    const level = Number(attrs?.level);
    return {
      type,
      attrs: { level: level === 3 || level === 4 ? level : 2 },
      content: children,
    };
  }

  if (type === "orderedList") {
    const attrs = objectValue(node?.attrs);
    const start = typeof attrs?.start === "number" && attrs.start > 0
      ? Math.floor(attrs.start)
      : 1;
    return { type, attrs: { start }, content: children };
  }

  if (type === "codeBlock") {
    const attrs = objectValue(node?.attrs);
    const language =
      typeof attrs?.language === "string"
        ? attrs.language.replace(/[^A-Za-z0-9_+-]/g, "").slice(0, 30)
        : "";
    return { type, attrs: { language }, content: children };
  }

  return { type, content: children };
}

export function normalizePostDocument(input: unknown): PostDocument | null {
  const document = objectValue(input);
  if (document?.type !== "doc") return null;

  const content = Array.isArray(document.content)
    ? document.content
        .map((node) => normalizeNode(node))
        .filter((node): node is PostNode => node !== null)
    : [];

  return { type: "doc", content };
}

function nodeText(node: PostNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "image") {
    const alt = node.attrs?.alt;
    return typeof alt === "string" ? alt : "";
  }
  return (node.content ?? []).map(nodeText).join(" ");
}

export function postDocumentText(document: PostDocument | null): string {
  return (document?.content ?? []).map(nodeText).join(" ").replace(/\s+/g, " ").trim();
}

export function markdownText(markdown: string | null | undefined): string {
  return (markdown ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`~\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function calculatePostReadTime(
  document: PostDocument | null,
  legacyContent?: string | null,
  excerpt?: string,
): string {
  const text = postDocumentText(document) || markdownText(legacyContent) || (excerpt ?? "");
  const words = text.match(WORD_REGEX)?.length ?? 0;
  return `${Math.max(1, Math.ceil(words / 200))} MIN`;
}

export function hasPostBody(document: PostDocument | null): boolean {
  return postDocumentText(document).length > 0 ||
    Boolean(document?.content?.some((node) => node.type === "image"));
}

export function missingImageAltCount(document: PostDocument | null): number {
  let count = 0;
  const visit = (node: PostNode) => {
    if (node.type === "image" && !String(node.attrs?.alt ?? "").trim()) {
      count += 1;
    }
    node.content?.forEach(visit);
  };
  document?.content?.forEach(visit);
  return count;
}

export function getPostHeadings(document: PostDocument | null): PostHeading[] {
  const used = new Map<string, number>();

  return (document?.content ?? []).flatMap((node): PostHeading[] => {
    if (node.type !== "heading") return [];
    const text = nodeText(node).trim();
    if (!text) return [];
    const baseId = createPostSlug(text) || "section";
    const occurrence = used.get(baseId) ?? 0;
    used.set(baseId, occurrence + 1);
    return [{
      id: occurrence === 0 ? baseId : `${baseId}-${occurrence + 1}`,
      level: Number(node.attrs?.level) || 2,
      text,
    }];
  });
}

export function formatEditorialDate(value: Date | null | undefined): string {
  if (!value) return "";
  return value.toISOString().slice(0, 10).replace(/-/g, ".");
}
