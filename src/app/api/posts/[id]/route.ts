import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_REGEX = /^\d{4}\.\d{2}\.\d{2}$/;
const READ_TIME_REGEX = /^\d{1,3}\s+MIN$/i;

function normalizeTags(input: unknown): string[] | undefined {
  if (!Array.isArray(input)) return undefined;

  return input
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 16);
}

// Public: get single post (by id or slug)
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Try by id first, then by slug
    let post = await prisma.post.findUnique({ where: { id } });
    if (!post) {
      post = await prisma.post.findUnique({ where: { slug: id } });
    }

    if (!post) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!post.published) {
      const session = await verifySession();
      if (!session) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    return NextResponse.json(post);
  } catch {
    return NextResponse.json({ error: "Failed to fetch post" }, { status: 500 });
  }
}

// Protected: update post
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;

    const data: {
      slug?: string;
      title?: string;
      excerpt?: string;
      content?: string | null;
      date?: string;
      readTime?: string;
      tags?: string[];
      published?: boolean;
    } = {};

    if (typeof body.slug === "string") {
      const slug = body.slug.trim();
      if (!slug || !SLUG_REGEX.test(slug)) {
        return NextResponse.json(
          { error: "Slug must be lowercase and hyphen-separated" },
          { status: 400 },
        );
      }
      data.slug = slug;
    }

    if (typeof body.title === "string") {
      const title = body.title.trim();
      if (!title || title.length > 180) {
        return NextResponse.json(
          { error: "Title is required and must be <= 180 characters" },
          { status: 400 },
        );
      }
      data.title = title;
    }

    if (typeof body.excerpt === "string") {
      const excerpt = body.excerpt.trim();
      if (!excerpt || excerpt.length > 400) {
        return NextResponse.json(
          { error: "Excerpt is required and must be <= 400 characters" },
          { status: 400 },
        );
      }
      data.excerpt = excerpt;
    }

    if (typeof body.content === "string") {
      const content = body.content.trim();
      if (content.length > 50000) {
        return NextResponse.json(
          { error: "Content must be <= 50000 characters" },
          { status: 400 },
        );
      }
      data.content = content || null;
    }

    if (typeof body.date === "string") {
      const date = body.date.trim();
      if (!DATE_REGEX.test(date)) {
        return NextResponse.json(
          { error: "Date must use YYYY.MM.DD format" },
          { status: 400 },
        );
      }
      data.date = date;
    }

    if (typeof body.readTime === "string") {
      const readTime = body.readTime.trim();
      if (!READ_TIME_REGEX.test(readTime)) {
        return NextResponse.json(
          { error: "Read time must use '<minutes> MIN' format" },
          { status: 400 },
        );
      }
      data.readTime = readTime.toUpperCase();
    }

    const tags = normalizeTags(body.tags);
    if (tags) {
      data.tags = tags;
    }

    if (typeof body.published === "boolean") {
      data.published = body.published;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update" },
        { status: 400 },
      );
    }

    const post = await prisma.post.update({
      where: { id },
      data,
    });

    return NextResponse.json(post);
  } catch {
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}

// Protected: delete post
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.post.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
