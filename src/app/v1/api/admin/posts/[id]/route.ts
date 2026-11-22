import {
  cmsActor,
  cmsErrorResponse,
  readJson,
  PRIVATE_API_HEADERS,
} from "@/lib/cmsServer";
import { requireVersion } from "@/lib/cmsRules";
import { NextResponse } from "next/server";
import {
  deleteAdminPost,
  getAdminPostById,
  updateAdminPost,
} from "@/lib/postEditorial";
import { requireAdminApi, requireAdminMutation } from "@/lib/requestSecurity";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { id } = await params;
  const post = await getAdminPostById(id);
  return post
    ? NextResponse.json(post, { headers: PRIVATE_API_HEADERS })
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;
  try {
    const { id } = await params;
    return NextResponse.json(
      await updateAdminPost(id, await readJson(request), await cmsActor()),
    );
  } catch (error) {
    return cmsErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;
  try {
    const { id } = await params;
    return NextResponse.json(
      await deleteAdminPost(
        id,
        requireVersion(await readJson(request)),
        await cmsActor(),
      ),
    );
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
