import { NextResponse } from "next/server";
import { listPublishedPosts } from "@/lib/postEditorial";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tag = searchParams.get("tag");
    const query = searchParams.get("q");
    const posts = await listPublishedPosts({
      query,
      tag,
    });
    return NextResponse.json(posts);
  } catch {
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}
