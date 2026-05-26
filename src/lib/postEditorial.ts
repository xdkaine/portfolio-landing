import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { PostStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  calculatePostReadTime,
  createPostSlug,
  formatEditorialDate,
  hasPostBody,
  isSafePostMediaSource,
  missingImageAltCount,
  normalizePostDocument,
  type PostDocument,
} from "@/lib/postContent";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_TITLE_LENGTH = 180;
const MAX_EXCERPT_LENGTH = 400;

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
  query?: string | null;
  tag?: string | null;
  limit?: number;
}

type PostRecord = Awaited<ReturnType<typeof prisma.post.findUniqueOrThrow>>;

function normalizeTags(input: unknown): string[] | undefined {
  if (!Array.isArray(input)) return undefined;
  return Array.from(
    new Set(
      input
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim().toUpperCase())
        .filter(Boolean),
    ),
  ).slice(0, 16);
}

function validateSlug(slug: string): void {
  if (!SLUG_REGEX.test(slug)) {
    throw new PostEditorialError("Slug must be lowercase and hyphen-separated", 400);
  }
}

function bodyDocument(post: { bodyJson: unknown }): PostDocument | null {
  return normalizePostDocument(post.bodyJson);
}

function publicationDate(post: Pick<PostRecord, "publishedAt" | "date">): string {
  return formatEditorialDate(post.publishedAt) || post.date;
}

export function toPublicPostSummary(post: PostRecord) {
  const document = bodyDocument(post);
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    date: publicationDate(post),
    publishedAt: post.publishedAt?.toISOString() ?? null,
    updatedAt: post.updatedAt.toISOString(),
    readTime: calculatePostReadTime(document, post.content, post.excerpt),
    tags: post.tags,
    coverImage: post.coverImage,
    coverAlt: post.coverAlt,
    featured: post.featured,
  };
}

export function toAdminPostRecord(post: PostRecord) {
  const document = bodyDocument(post);
  return {
    ...toPublicPostSummary(post),
    content: post.content,
    bodyJson: document,
    status: post.status,
    published: post.published,
    createdAt: post.createdAt.toISOString(),
    needsContent: !hasPostBody(document) && !post.content?.trim(),
  };
}

function publishedWhere(options: ListPostsOptions = {}) {
  const query = options.query?.trim();
  const tag = options.tag?.trim().toUpperCase();

  return {
    status: PostStatus.PUBLISHED,
    published: true,
    ...(tag ? { tags: { has: tag } } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" as const } },
            { excerpt: { contains: query, mode: "insensitive" as const } },
            { tags: { has: query.toUpperCase() } },
          ],
        }
      : {}),
  };
}

export async function listPublishedPosts(options: ListPostsOptions = {}) {
  const posts = await prisma.post.findMany({
    where: publishedWhere(options),
    orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    ...(options.limit ? { take: options.limit } : {}),
  });

  return posts.map(toPublicPostSummary);
}

export async function listPublishedTags(): Promise<{ name: string; count: number }[]> {
  const posts = await prisma.post.findMany({
    where: publishedWhere(),
    select: { tags: true },
  });
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return Array.from(counts, ([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

export async function getPublishedPostBySlug(slug: string) {
  const post = await prisma.post.findFirst({
    where: { slug, ...publishedWhere() },
  });
  return post ? toAdminPostRecord(post) : null;
}

export async function listAdminPosts() {
  const posts = await prisma.post.findMany({
    orderBy: [{ updatedAt: "desc" }],
  });
  return posts.map(toAdminPostRecord);
}

export async function getAdminPostById(id: string) {
  const post = await prisma.post.findUnique({ where: { id } });
  return post ? toAdminPostRecord(post) : null;
}

export async function createDraftPost() {
  const suffix = randomUUID().slice(0, 8);
  const post = await prisma.post.create({
    data: {
      slug: `untitled-transmission-${suffix}`,
      title: "UNTITLED TRANSMISSION",
      excerpt: "",
      content: null,
      bodyJson: { type: "doc", content: [{ type: "paragraph" }] },
      date: formatEditorialDate(new Date()),
      readTime: "1 MIN",
      tags: [],
      status: PostStatus.DRAFT,
      published: false,
      featured: false,
    },
  });
  return toAdminPostRecord(post);
}

interface EditorialChanges {
  title?: string;
  slug?: string;
  excerpt?: string;
  tags?: string[];
  bodyJson?: PostDocument;
  coverImage?: string | null;
  coverAlt?: string | null;
  featured?: boolean;
}

function parseEditorialChanges(input: unknown): EditorialChanges {
  if (!input || typeof input !== "object") {
    throw new PostEditorialError("No valid fields provided for update", 400);
  }
  const body = input as Record<string, unknown>;
  const data: EditorialChanges = {};

  if (typeof body.title === "string") {
    const title = body.title.trim();
    if (title.length > MAX_TITLE_LENGTH) {
      throw new PostEditorialError("Title must be <= 180 characters", 400);
    }
    data.title = title;
  }
  if (typeof body.slug === "string") {
    const slug = createPostSlug(body.slug);
    validateSlug(slug);
    data.slug = slug;
  }
  if (typeof body.excerpt === "string") {
    const excerpt = body.excerpt.trim();
    if (excerpt.length > MAX_EXCERPT_LENGTH) {
      throw new PostEditorialError("Excerpt must be <= 400 characters", 400);
    }
    data.excerpt = excerpt;
  }
  const tags = normalizeTags(body.tags);
  if (tags) data.tags = tags;

  if ("bodyJson" in body) {
    const document = normalizePostDocument(body.bodyJson);
    if (!document) {
      throw new PostEditorialError("Article body contains unsupported content", 400);
    }
    data.bodyJson = document;
  }
  if ("coverImage" in body) {
    if (body.coverImage === null || body.coverImage === "") {
      data.coverImage = null;
    } else if (typeof body.coverImage === "string" && isSafePostMediaSource(body.coverImage.trim())) {
      data.coverImage = body.coverImage.trim();
    } else {
      throw new PostEditorialError("Cover image URL is invalid", 400);
    }
  }
  if ("coverAlt" in body) {
    data.coverAlt = typeof body.coverAlt === "string" && body.coverAlt.trim()
      ? body.coverAlt.trim().slice(0, 240)
      : null;
  }
  if (typeof body.featured === "boolean") data.featured = body.featured;

  if (Object.keys(data).length === 0) {
    throw new PostEditorialError("No valid fields provided for update", 400);
  }
  return data;
}

export async function updateAdminPost(id: string, input: unknown) {
  const current = await prisma.post.findUnique({ where: { id } });
  if (!current) throw new PostEditorialError("Post not found", 404);

  const changes = parseEditorialChanges(input);
  if (
    changes.slug &&
    current.publishedAt &&
    changes.slug !== current.slug
  ) {
    throw new PostEditorialError("A published post slug cannot be changed", 400);
  }

  const document = changes.bodyJson ?? bodyDocument(current);
  const nextContent: Prisma.PostUpdateInput = {
    readTime: calculatePostReadTime(document, current.content, changes.excerpt ?? current.excerpt),
  };
  if (changes.title !== undefined) nextContent.title = changes.title;
  if (changes.slug !== undefined) nextContent.slug = changes.slug;
  if (changes.excerpt !== undefined) nextContent.excerpt = changes.excerpt;
  if (changes.tags !== undefined) nextContent.tags = changes.tags;
  if (changes.coverImage !== undefined) nextContent.coverImage = changes.coverImage;
  if (changes.coverAlt !== undefined) nextContent.coverAlt = changes.coverAlt;
  if (changes.featured !== undefined) nextContent.featured = changes.featured;
  if (changes.bodyJson !== undefined) {
    nextContent.bodyJson = changes.bodyJson as unknown as Prisma.InputJsonValue;
  }

  const post = await prisma.post.update({
    where: { id },
    data: nextContent,
  });
  return toAdminPostRecord(post);
}

function validatePublishable(post: PostRecord): void {
  const document = bodyDocument(post);
  if (!post.title.trim() || !post.slug.trim() || !post.excerpt.trim()) {
    throw new PostEditorialError("Title, slug, and excerpt are required before publishing", 400);
  }
  validateSlug(post.slug);
  if (!hasPostBody(document) && !post.content?.trim()) {
    throw new PostEditorialError("Write article content before publishing", 400);
  }
  if (missingImageAltCount(document) > 0) {
    throw new PostEditorialError("Every article image needs alt text before publishing", 400);
  }
  if (post.coverImage && !post.coverAlt?.trim()) {
    throw new PostEditorialError("The cover image needs alt text before publishing", 400);
  }
}

export async function publishAdminPost(id: string) {
  const current = await prisma.post.findUnique({ where: { id } });
  if (!current) throw new PostEditorialError("Post not found", 404);
  validatePublishable(current);

  const publishedAt = current.publishedAt ?? new Date();
  const post = await prisma.post.update({
    where: { id },
    data: {
      status: PostStatus.PUBLISHED,
      published: true,
      publishedAt,
      date: formatEditorialDate(publishedAt),
      readTime: calculatePostReadTime(bodyDocument(current), current.content, current.excerpt),
    },
  });
  return toAdminPostRecord(post);
}

export async function archiveAdminPost(id: string) {
  const post = await prisma.post.update({
    where: { id },
    data: { status: PostStatus.ARCHIVED, published: false },
  });
  return toAdminPostRecord(post);
}

export async function deleteAdminPost(id: string) {
  await prisma.post.delete({ where: { id } });
}

export async function getPostConnections(postId: string, tags: string[]) {
  const posts = await prisma.post.findMany({
    where: publishedWhere(),
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  });
  const currentIndex = posts.findIndex((post) => post.id === postId);
  const related = posts
    .filter((post) => post.id !== postId && post.tags.some((tag) => tags.includes(tag)))
    .slice(0, 3)
    .map(toPublicPostSummary);

  return {
    previous: currentIndex >= 0 && currentIndex < posts.length - 1
      ? toPublicPostSummary(posts[currentIndex + 1])
      : null,
    next: currentIndex > 0 ? toPublicPostSummary(posts[currentIndex - 1]) : null,
    related,
  };
}
