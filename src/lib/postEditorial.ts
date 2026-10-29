import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
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
import { normalizeV1PublicUrl } from "@/lib/v1Path";

import { CmsError, requireVersion } from "./cmsRules";

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
    throw new PostEditorialError(
      "Slug must be lowercase and hyphen-separated",
      400,
    );
  }
}

function bodyDocument(post: { bodyJson: unknown }): PostDocument | null {
  return normalizePostDocument(post.bodyJson);
}

function publicationDate(
  post: Pick<PostRecord, "publishedAt" | "date">,
): string {
  return formatEditorialDate(post.publishedAt) || post.date;
}

function postSummary(post: PostRecord) {
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
    coverImage: post.coverImage ? normalizeV1PublicUrl(post.coverImage) : null,
    coverAlt: post.coverAlt,
    featured: post.featured,
  };
}

function workingRecord(post: PostRecord): PostRecord {
  const snapshot = post.draftSnapshot;
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot))
    return post;
  return {
    ...post,
    ...snapshot,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
  } as PostRecord;
}
export function toPublicPostSummary(post: PostRecord) {
  return postSummary(post);
}

export function toAdminPostRecord(post: PostRecord) {
  post = workingRecord(post);
  const document = bodyDocument(post);
  return {
    ...postSummary(post),
    version: post.version,
    deletedAt: post.deletedAt?.toISOString() ?? null,
    hasUnpublishedChanges: Boolean(post.draftSnapshot),
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
    deletedAt: null,
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
    where: publishedWhere(),
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  });
  const query = options.query?.trim().toLowerCase();
  const tag = options.tag?.trim().toUpperCase();
  const items = posts
    .map(toPublicPostSummary)
    .filter(
      (post) =>
        (!tag || post.tags.includes(tag)) &&
        (!query ||
          [post.title, post.excerpt, ...post.tags].some((text) =>
            text.toLowerCase().includes(query),
          )),
    )
    .sort((left, right) => Number(right.featured) - Number(left.featured));
  return options.limit ? items.slice(0, options.limit) : items;
}
export async function listPublishedTags(): Promise<
  { name: string; count: number }[]
> {
  const posts = await listPublishedPosts();
  const counts = new Map<string, number>();
  for (const post of posts)
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return Array.from(counts, ([name, count]) => ({ name, count })).sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
}

export async function getPublishedPostBySlug(slug: string) {
  const post = await prisma.post.findFirst({
    where: { slug, ...publishedWhere() },
  });
  return post ? toAdminPostRecord({ ...post, draftSnapshot: null }) : null;
}

export async function listAdminPosts() {
  const posts = await prisma.post.findMany({
    orderBy: [{ updatedAt: "desc" }],
  });
  return posts.map((post) => {
    const {
      content: _content,
      bodyJson: _body,
      ...summary
    } = toAdminPostRecord(post);
    void _content;
    void _body;
    return summary;
  });
}

export async function getAdminPostById(id: string) {
  const post = await prisma.post.findUnique({ where: { id } });
  return post ? toAdminPostRecord(post) : null;
}

export async function createDraftPost(actor = "Administrator") {
  const suffix = randomUUID().slice(0, 8);
  return prisma.$transaction(async (tx) => {
    const post = await tx.post.create({
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
    await tx.cmsAuditEvent.create({
      data: {
        actor,
        action: "created",
        entity: "post",
        entityId: post.id,
        summary: post.title,
      },
    });
    return toAdminPostRecord(post);
  });
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
      throw new PostEditorialError(
        "Article body contains unsupported content",
        400,
      );
    }
    data.bodyJson = document;
  }
  if ("coverImage" in body) {
    if (body.coverImage === null || body.coverImage === "") {
      data.coverImage = null;
    } else if (
      typeof body.coverImage === "string" &&
      isSafePostMediaSource(body.coverImage.trim())
    ) {
      data.coverImage = normalizeV1PublicUrl(body.coverImage);
    } else {
      throw new PostEditorialError("Cover image URL is invalid", 400);
    }
  }
  if ("coverAlt" in body) {
    data.coverAlt =
      typeof body.coverAlt === "string" && body.coverAlt.trim()
        ? body.coverAlt.trim().slice(0, 240)
        : null;
  }
  if (typeof body.featured === "boolean") data.featured = body.featured;

  if (Object.keys(data).length === 0) {
    throw new PostEditorialError("No valid fields provided for update", 400);
  }
  return data;
}

export async function updateAdminPost(
  id: string,
  input: unknown,
  actor = "Administrator",
) {
  const version = requireVersion(input);
  return mutatePost(id, version, actor, "saved", (current) => {
    const changes = parseEditorialChanges(input);
    if (changes.slug && current.publishedAt && changes.slug !== current.slug) {
      throw new PostEditorialError(
        "A published post slug cannot be changed",
        400,
      );
    }

    const document = changes.bodyJson ?? bodyDocument(current);
    const nextContent: Prisma.PostUpdateManyMutationInput = {
      readTime: calculatePostReadTime(
        document,
        changes.bodyJson ? null : current.content,
        changes.excerpt ?? current.excerpt,
      ),
    };
    if (changes.title !== undefined) nextContent.title = changes.title;
    if (changes.slug !== undefined) nextContent.slug = changes.slug;
    if (changes.excerpt !== undefined) nextContent.excerpt = changes.excerpt;
    if (changes.tags !== undefined) nextContent.tags = changes.tags;
    if (changes.coverImage !== undefined)
      nextContent.coverImage = changes.coverImage;
    if (changes.coverAlt !== undefined) nextContent.coverAlt = changes.coverAlt;
    if (changes.featured !== undefined) nextContent.featured = changes.featured;
    if (changes.bodyJson !== undefined) {
      nextContent.content = null;
      nextContent.bodyJson =
        changes.bodyJson as unknown as Prisma.InputJsonValue;
    }

    if (current.status === PostStatus.PUBLISHED) {
      return {
        draftSnapshot: {
          ...snapshotOf(current),
          ...nextContent,
        } as Prisma.InputJsonObject,
      };
    }
    return { ...nextContent, draftSnapshot: Prisma.DbNull };
  });
}

function validatePublishable(post: PostRecord): void {
  const document = bodyDocument(post);
  if (!post.title.trim() || !post.slug.trim() || !post.excerpt.trim()) {
    throw new PostEditorialError(
      "Title, slug, and excerpt are required before publishing",
      400,
    );
  }
  validateSlug(post.slug);
  if (!hasPostBody(document) && !post.content?.trim()) {
    throw new PostEditorialError(
      "Write article content before publishing",
      400,
    );
  }
  if (missingImageAltCount(document) > 0) {
    throw new PostEditorialError(
      "Every article image needs alt text before publishing",
      400,
    );
  }
  if (post.coverImage && !post.coverAlt?.trim()) {
    throw new PostEditorialError(
      "The cover image needs alt text before publishing",
      400,
    );
  }
}

function snapshotOf(post: PostRecord): Prisma.InputJsonObject {
  const {
    title,
    slug,
    excerpt,
    content,
    bodyJson,
    tags,
    coverImage,
    coverAlt,
    featured,
    readTime,
    date,
    updatedAt,
  } = post;
  return JSON.parse(
    JSON.stringify({
      title,
      slug,
      excerpt,
      content,
      bodyJson,
      tags,
      coverImage,
      coverAlt,
      featured,
      readTime,
      date,
      updatedAt,
    }),
  );
}

async function mutatePost(
  id: string,
  version: number,
  actor: string,
  action: string,
  change: (
    current: PostRecord,
  ) =>
    | Prisma.PostUpdateManyMutationInput
    | Promise<Prisma.PostUpdateManyMutationInput>,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.post.findUnique({ where: { id } });
    if (!current) throw new CmsError("Post not found", 404);
    if (current.version !== version)
      throw new CmsError(
        "This post changed in another editor. Your changes have not overwritten it. Copy your work and reload the latest version.",
        409,
      );
    if (current.deletedAt && action !== "restored")
      throw new CmsError(
        "Restore this post from Trash before editing it.",
        409,
      );
    const data = await change(workingRecord(current));
    const result = await tx.post.updateMany({
      where: { id, version },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count !== 1)
      throw new CmsError(
        "This post changed in another editor. Reload the latest version.",
        409,
      );
    await tx.postRevision.upsert({
      where: { postId_version: { postId: id, version } },
      create: {
        postId: id,
        version,
        snapshot: snapshotOf(workingRecord(current)),
        actor,
      },
      update: {},
    });
    const post = await tx.post.findUniqueOrThrow({ where: { id } });
    await tx.postRevision.create({
      data: {
        postId: id,
        version: post.version,
        snapshot: snapshotOf(workingRecord(post)),
        actor,
      },
    });
    // Keep the most recent 50 content versions. Audit history remains independent.
    const excess = await tx.postRevision.findMany({
      where: { postId: id },
      orderBy: { version: "desc" },
      skip: 50,
      select: { id: true },
    });
    if (excess.length)
      await tx.postRevision.deleteMany({
        where: { id: { in: excess.map((row) => row.id) } },
      });
    await tx.cmsAuditEvent.create({
      data: {
        actor,
        action,
        entity: "post",
        entityId: id,
        summary: post.title.slice(0, 180),
      },
    });
    return toAdminPostRecord(post);
  });
}

export async function publishAdminPost(
  id: string,
  version: number,
  actor = "Administrator",
) {
  return mutatePost(id, version, actor, "published", (current) => {
    validatePublishable(current);
    const publishedAt = current.publishedAt ?? new Date();
    return {
      ...snapshotOf(current),
      bodyJson:
        current.bodyJson === null
          ? Prisma.DbNull
          : (current.bodyJson as Prisma.InputJsonValue),
      updatedAt: new Date(),
      status: PostStatus.PUBLISHED,
      published: true,
      publishedAt,
      draftSnapshot: Prisma.DbNull,
      date: formatEditorialDate(publishedAt),
      readTime: calculatePostReadTime(
        bodyDocument(current),
        current.content,
        current.excerpt,
      ),
    } as Prisma.PostUpdateManyMutationInput;
  });
}
export async function archiveAdminPost(
  id: string,
  version: number,
  actor = "Administrator",
) {
  return mutatePost(id, version, actor, "archived", () => ({
    status: PostStatus.ARCHIVED,
    published: false,
  }));
}
export async function deleteAdminPost(
  id: string,
  version: number,
  actor = "Administrator",
) {
  return mutatePost(id, version, actor, "trashed", () => ({
    status: PostStatus.ARCHIVED,
    published: false,
    deletedAt: new Date(),
  }));
}
export async function restoreAdminPost(
  id: string,
  version: number,
  actor = "Administrator",
) {
  return mutatePost(
    id,
    version,
    actor,
    "restored",
    (current) =>
      ({
        ...snapshotOf(current),
        bodyJson:
          current.bodyJson === null
            ? Prisma.DbNull
            : (current.bodyJson as Prisma.InputJsonValue),
        updatedAt: new Date(),
        deletedAt: null,
        status: PostStatus.DRAFT,
        published: false,
        draftSnapshot: Prisma.DbNull,
      }) as Prisma.PostUpdateManyMutationInput,
  );
}
export async function restorePostRevision(
  id: string,
  version: number,
  revision: number,
  actor = "Administrator",
) {
  return mutatePost(
    id,
    version,
    actor,
    "revision restored",
    async (current) => {
      const saved = await prisma.postRevision.findUnique({
        where: { postId_version: { postId: id, version: revision } },
      });
      if (!saved) throw new CmsError("Revision not found", 404);
      const snapshot = saved.snapshot as Prisma.InputJsonObject;
      const changes = parseEditorialChanges(snapshot);
      if (current.publishedAt && changes.slug !== current.slug)
        changes.slug = current.slug;
      const content = {
        ...snapshotOf(current),
        ...changes,
        content: typeof snapshot.content === "string" ? snapshot.content : null,
        bodyJson: changes.bodyJson ?? null,
      };
      if (current.status === PostStatus.PUBLISHED)
        return { draftSnapshot: content as unknown as Prisma.InputJsonValue };
      return {
        ...changes,
        content: content.content,
        bodyJson: content.bodyJson ?? Prisma.DbNull,
        draftSnapshot: Prisma.DbNull,
      } as unknown as Prisma.PostUpdateManyMutationInput;
    },
  );
}

export async function getPostConnections(postId: string, tags: string[]) {
  const posts = await prisma.post.findMany({
    where: publishedWhere(),
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  });
  const publicPosts = posts;
  const currentIndex = publicPosts.findIndex((post) => post.id === postId);
  const related = publicPosts
    .filter(
      (post) =>
        post.id !== postId && post.tags.some((tag) => tags.includes(tag)),
    )
    .slice(0, 3)
    .map(toPublicPostSummary);

  return {
    previous:
      currentIndex >= 0 && currentIndex < posts.length - 1
        ? toPublicPostSummary(posts[currentIndex + 1])
        : null,
    next:
      currentIndex > 0 ? toPublicPostSummary(posts[currentIndex - 1]) : null,
    related,
  };
}
