import { NextResponse } from "next/server";
import {
  deleteProject,
  getProjectByIdOrNumber,
  ProjectCatalogError,
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
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

// Protected: update project
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const denied = await requireAdminMutation(request);
    if (denied) return denied;

    const { id } = await params;
    const project = await updateProject(id, await request.json());
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    if (error instanceof ProjectCatalogError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

// Protected: delete project
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const denied = await requireAdminMutation(request);
    if (denied) return denied;

    const { id } = await params;
    await deleteProject(id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
