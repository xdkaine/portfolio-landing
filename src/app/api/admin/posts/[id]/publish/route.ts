import { NextResponse } from "next/server";
import { PostEditorialError, publishAdminPost } from "@/lib/postEditorial";
import { requireAdminMutation } from "@/lib/requestSecurity";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;

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
