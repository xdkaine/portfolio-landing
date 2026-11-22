import { cmsActor, cmsErrorResponse, readJson } from "@/lib/cmsServer";
import { requireVersion } from "@/lib/cmsRules";
import { NextResponse } from "next/server";
import {
  deleteProject,
  getProjectByIdOrNumber,
  updateProject,
} from "@/lib/projectCatalog";
import { requireAdminMutation } from "@/lib/requestSecurity";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteParams = { params: Promise<{ id: string }> };

// Public: get single project
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const project = await getProjectByIdOrNumber(id);
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 },
    );
  }
}

// Protected: update project
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const denied = await requireAdminMutation(request);
    if (denied) return denied;

    const { id } = await params;
    const project = await updateProject(
      id,
      await readJson(request),
      await cmsActor(),
    );
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    return cmsErrorResponse(error);
  }
}

// Protected: delete project
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const denied = await requireAdminMutation(request);
    if (denied) return denied;

    const { id } = await params;
    await deleteProject(
      id,
      requireVersion(await readJson(request)),
      await cmsActor(),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
