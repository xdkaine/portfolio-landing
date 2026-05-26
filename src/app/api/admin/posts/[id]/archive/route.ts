import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { archiveAdminPost } from "@/lib/postEditorial";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { id } = await params;
    return NextResponse.json(await archiveAdminPost(id));
  } catch {
    return NextResponse.json({ error: "Failed to archive post" }, { status: 500 });
  }
}
