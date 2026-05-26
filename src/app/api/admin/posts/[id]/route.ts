import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import {
  deleteAdminPost,
  getAdminPostById,
  PostEditorialError,
  updateAdminPost,
} from "@/lib/postEditorial";

type RouteParams = { params: Promise<{ id: string }> };

async function authorize() {
  const session = await verifySession();
  return session ? null : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(_request: Request, { params }: RouteParams) {
  const denied = await authorize();
  if (denied) return denied;
  const { id } = await params;
  const post = await getAdminPostById(id);
  return post
    ? NextResponse.json(post)
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const denied = await authorize();
  if (denied) return denied;
  try {
    const { id } = await params;
    return NextResponse.json(await updateAdminPost(id, await request.json()));
  } catch (error) {
    if (error instanceof PostEditorialError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to save draft" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const denied = await authorize();
  if (denied) return denied;
  try {
    const { id } = await params;
    await deleteAdminPost(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
