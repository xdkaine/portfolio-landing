import { NextResponse } from "next/server";
import {
  deleteAdminPost,
  getAdminPostById,
  PostEditorialError,
  updateAdminPost,
} from "@/lib/postEditorial";
import {
  requireAdminApi,
  requireAdminMutation,
} from "@/lib/requestSecurity";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = await params;
  const post = await getAdminPostById(id);
  return post
    ? NextResponse.json(post)
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const denied = await requireAdminMutation(request);
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

export async function DELETE(request: Request, { params }: RouteParams) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;
  try {
    const { id } = await params;
    await deleteAdminPost(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
