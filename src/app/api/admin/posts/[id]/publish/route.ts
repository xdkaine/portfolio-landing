import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { PostEditorialError, publishAdminPost } from "@/lib/postEditorial";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    return NextResponse.json(await publishAdminPost(id));
  } catch (error) {
    if (error instanceof PostEditorialError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to publish post" }, { status: 500 });
  }
}
