import { NextResponse } from "next/server";
import { publishAdminPost } from "@/lib/postEditorial";
import { requireAdminMutation } from "@/lib/requestSecurity";
import { cmsActor, cmsErrorResponse, readJson } from "@/lib/cmsServer";
import { requireVersion } from "@/lib/cmsRules";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;
  try {
    const { id } = await params;
    return NextResponse.json(
      await publishAdminPost(
        id,
        requireVersion(await readJson(request)),
        await cmsActor(),
      ),
    );
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
