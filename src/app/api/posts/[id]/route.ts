import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import {
  deletePost,
  getPostByIdOrSlug,
  PostEditorialError,
  updatePost,
} from "@/lib/postEditorial";

type RouteParams = { params: Promise<{ id: string }> };

// Public: get single post (by id or slug)
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const [session, { id }] = await Promise.all([
      verifySession().catch(() => null),
      params,
    ]);
    const post = await getPostByIdOrSlug(id, {
      includeUnpublished: Boolean(session),
    });
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(post);
  } catch {
    return NextResponse.json({ error: "Failed to fetch post" }, { status: 500 });
  }
}

// Protected: update post
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const [session, { id }] = await Promise.all([verifySession(), params]);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const post = await updatePost(id, await request.json());

    return NextResponse.json(post);
  } catch (error) {
    if (error instanceof PostEditorialError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}

// Protected: delete post
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const [session, { id }] = await Promise.all([verifySession(), params]);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await deletePost(id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
