import { NextResponse } from "next/server";
import {
  createProject,
  listProjects,
  ProjectCatalogError,
} from "@/lib/projectCatalog";
import { requireAdminMutation } from "@/lib/requestSecurity";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Public: list all projects
export async function GET() {
  try {
    return NextResponse.json(await listProjects());
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// Protected: create a project
export async function POST(request: Request) {
  try {
    const denied = await requireAdminMutation(request);
    if (denied) return denied;

    return NextResponse.json(await createProject(await request.json()), {
      status: 201,
    });
  } catch (error) {
    if (error instanceof ProjectCatalogError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("[api/projects] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
