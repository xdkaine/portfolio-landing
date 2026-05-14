import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import {
  createPost,
  listPosts,
  PostEditorialError,
} from "@/lib/postEditorial";

// Public: list all published posts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tag = searchParams.get("tag");
    const all = searchParams.get("all"); // admin flag to include unpublished

    const session = await verifySession().catch(() => null);
    const showAll = all === "true" && session;

    const posts = await listPosts({
      includeUnpublished: Boolean(showAll),
      tag,
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

    const post = await createPost(await request.json());

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    if (error instanceof PostEditorialError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("[api/posts] POST error:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
