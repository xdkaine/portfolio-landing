import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { createDraftPost, listAdminPosts } from "@/lib/postEditorial";

async function authenticated(): Promise<boolean> {
  return Boolean(await verifySession());
}

export async function GET() {
  if (!(await authenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await listAdminPosts());
  } catch {
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST() {
  if (!(await authenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await createDraftPost(), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create draft" }, { status: 500 });
  }
}
