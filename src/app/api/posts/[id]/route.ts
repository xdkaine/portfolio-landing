import { NextResponse } from "next/server";
import { getPublishedPostBySlug } from "@/lib/postEditorial";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const post = await getPublishedPostBySlug(id);
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(post);
  } catch {
    return NextResponse.json({ error: "Failed to fetch post" }, { status: 500 });
  }
}
