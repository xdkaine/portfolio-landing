import { NextResponse } from "next/server";
import { requireAdminMutation } from "@/lib/requestSecurity";
import { cmsActor, cmsErrorResponse, readJson } from "@/lib/cmsServer";
import { requireVersion } from "@/lib/cmsRules";
import { deleteProject } from "@/lib/projectCatalog";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;
  try {
    const { id } = await params;
    await deleteProject(
      id,
      requireVersion(await readJson(request)),
      await cmsActor(),
      true,
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
