import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_REGEX = /^\d{4}\.\d{2}\.\d{2}$/;
const READ_TIME_REGEX = /^\d{1,3}\s+MIN$/i;

function normalizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  return input
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 16);
}

// Public: list all published posts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tag = searchParams.get("tag");
    const all = searchParams.get("all"); // admin flag to include unpublished

    const session = await verifySession().catch(() => null);
    const showAll = all === "true" && session;

    const posts = await prisma.post.findMany({
      where: {
        ...(showAll ? {} : { published: true }),
        ...(tag ? { tags: { has: tag } } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(posts);
  } catch {
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

// Protected: create a post
export async function POST(request: Request) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const excerpt = typeof body.excerpt === "string" ? body.excerpt.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : undefined;
    const date = typeof body.date === "string" ? body.date.trim() : "";
    const readTime = typeof body.readTime === "string" ? body.readTime.trim() : "";
    const tags = normalizeTags(body.tags);
    const published = body.published !== false;

    if (!slug || !title || !excerpt) {
      return NextResponse.json(
        { error: "slug, title, and excerpt are required" },
        { status: 400 }
      );
    }

    if (!SLUG_REGEX.test(slug)) {
      return NextResponse.json(
        { error: "Slug must be lowercase and hyphen-separated" },
        { status: 400 },
      );
    }

    if (title.length > 180 || excerpt.length > 400 || (content?.length ?? 0) > 50000) {
      return NextResponse.json(
        { error: "Content exceeds allowed length" },
        { status: 400 },
      );
    }

    if (date && !DATE_REGEX.test(date)) {
      return NextResponse.json(
        { error: "Date must use YYYY.MM.DD format" },
        { status: 400 },
      );
    }

    if (readTime && !READ_TIME_REGEX.test(readTime)) {
      return NextResponse.json(
        { error: "Read time must use '<minutes> MIN' format" },
        { status: 400 },
      );
    }

    const post = await prisma.post.create({
      data: {
        slug,
        title,
        excerpt,
        content: content || null,
        date: date || new Date().toISOString().slice(0, 10).replace(/-/g, "."),
        readTime: readTime || "5 MIN",
        tags,
        published,
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("[api/posts] POST error:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
