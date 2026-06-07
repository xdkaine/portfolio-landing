import { NextResponse } from "next/server";
import { archiveAdminPost } from "@/lib/postEditorial";
import { requireAdminMutation } from "@/lib/requestSecurity";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;

  try {
    const { id } = await params;
    return NextResponse.json(await archiveAdminPost(id));
  } catch {
    return NextResponse.json({ error: "Failed to archive post" }, { status: 500 });
  }
}
