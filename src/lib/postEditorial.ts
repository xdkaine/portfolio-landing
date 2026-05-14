import "server-only";

import { prisma } from "@/lib/prisma";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_REGEX = /^\d{4}\.\d{2}\.\d{2}$/;
const READ_TIME_REGEX = /^\d{1,3}\s+MIN$/i;

export class PostEditorialError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PostEditorialError";
  }
}

interface ListPostsOptions {
  includeUnpublished?: boolean;
  tag?: string | null;
}

interface GetPostOptions {
  includeUnpublished?: boolean;
}

interface CreatePostData {
  slug: string;
  title: string;
  excerpt: string;
  content: string | null;
  date: string;
  readTime: string;
  tags: string[];
  published: boolean;
}

interface UpdatePostData {
  slug?: string;
  title?: string;
  excerpt?: string;
  content?: string | null;
  date?: string;
  readTime?: string;
  tags?: string[];
  published?: boolean;
}

function normalizeTags(input: unknown, fallback: string[] | undefined): string[] | undefined {
  if (!Array.isArray(input)) return fallback;

  return input
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 16);
}

function defaultPostDate(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, ".");
}

function assertSlug(slug: string): void {
  if (!slug || !SLUG_REGEX.test(slug)) {
    throw new PostEditorialError(
      "Slug must be lowercase and hyphen-separated",
      400,
    );
  }
}

function assertDate(date: string): void {
  if (date && !DATE_REGEX.test(date)) {
    throw new PostEditorialError("Date must use YYYY.MM.DD format", 400);
  }
}

function assertReadTime(readTime: string): void {
  if (readTime && !READ_TIME_REGEX.test(readTime)) {
    throw new PostEditorialError("Read time must use '<minutes> MIN' format", 400);
  }
}

export function parseCreatePostInput(input: unknown): CreatePostData {
  if (!input || typeof input !== "object") {
    throw new PostEditorialError("slug, title, and excerpt are required", 400);
  }

  const body = input as Record<string, unknown>;
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const excerpt = typeof body.excerpt === "string" ? body.excerpt.trim() : "";
  const content =
    typeof body.content === "string" ? body.content.trim() : undefined;
  const date = typeof body.date === "string" ? body.date.trim() : "";
  const readTime =
    typeof body.readTime === "string" ? body.readTime.trim().toUpperCase() : "";
  const tags = normalizeTags(body.tags, []) ?? [];
  const published = body.published !== false;

  if (!slug || !title || !excerpt) {
    throw new PostEditorialError("slug, title, and excerpt are required", 400);
  }

  assertSlug(slug);
  if (title.length > 180 || excerpt.length > 400 || (content?.length ?? 0) > 50000) {
    throw new PostEditorialError("Content exceeds allowed length", 400);
  }
  assertDate(date);
  assertReadTime(readTime);

  return {
    slug,
    title,
    excerpt,
    content: content || null,
    date: date || defaultPostDate(),
    readTime: readTime || "5 MIN",
    tags,
    published,
  };
}

export function parseUpdatePostInput(input: unknown): UpdatePostData {
  if (!input || typeof input !== "object") {
    throw new PostEditorialError("No valid fields provided for update", 400);
  }

  const body = input as Record<string, unknown>;
  const data: UpdatePostData = {};

  if (typeof body.slug === "string") {
    const slug = body.slug.trim();
    assertSlug(slug);
    data.slug = slug;
  }

  if (typeof body.title === "string") {
    const title = body.title.trim();
    if (!title || title.length > 180) {
      throw new PostEditorialError(
        "Title is required and must be <= 180 characters",
        400,
      );
    }
    data.title = title;
  }

  if (typeof body.excerpt === "string") {
    const excerpt = body.excerpt.trim();
    if (!excerpt || excerpt.length > 400) {
      throw new PostEditorialError(
        "Excerpt is required and must be <= 400 characters",
        400,
      );
    }
    data.excerpt = excerpt;
  }

  if (typeof body.content === "string") {
    const content = body.content.trim();
    if (content.length > 50000) {
      throw new PostEditorialError("Content must be <= 50000 characters", 400);
    }
    data.content = content || null;
  }

  if (typeof body.date === "string") {
    const date = body.date.trim();
    assertDate(date);
    data.date = date;
  }

  if (typeof body.readTime === "string") {
    const readTime = body.readTime.trim().toUpperCase();
    assertReadTime(readTime);
    data.readTime = readTime;
  }

  const tags = normalizeTags(body.tags, undefined);
  if (tags) {
    data.tags = tags;
  }

  if (typeof body.published === "boolean") {
    data.published = body.published;
  }

  if (Object.keys(data).length === 0) {
    throw new PostEditorialError("No valid fields provided for update", 400);
  }

  return data;
}

export async function listPosts(options: ListPostsOptions = {}) {
  return prisma.post.findMany({
    where: {
      ...(options.includeUnpublished ? {} : { published: true }),
      ...(options.tag ? { tags: { has: options.tag } } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPostByIdOrSlug(
  idOrSlug: string,
  options: GetPostOptions = {},
) {
  const post =
    (await prisma.post.findUnique({ where: { id: idOrSlug } })) ??
    (await prisma.post.findUnique({ where: { slug: idOrSlug } }));

  if (!post) return null;
  if (!options.includeUnpublished && !post.published) return null;
  return post;
}

export async function createPost(input: unknown) {
  const data = parseCreatePostInput(input);
  return prisma.post.create({ data });
}

export async function updatePost(id: string, input: unknown) {
  const data = parseUpdatePostInput(input);
  return prisma.post.update({ where: { id }, data });
}

export async function deletePost(id: string) {
  await prisma.post.delete({ where: { id } });
}
