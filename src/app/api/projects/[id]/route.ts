import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import {
  deleteProject,
  getProjectByIdOrNumber,
  updateProject,
} from "@/lib/projectCatalog";

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
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const project = await updateProject(id, await request.json());
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

// Protected: delete project
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await deleteProject(id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
