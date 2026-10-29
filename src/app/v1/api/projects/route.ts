import {
  cmsActor,
  cmsErrorResponse,
  readJson,
  PRIVATE_API_HEADERS,
} from "@/lib/cmsServer";
import { requireAdminApi } from "@/lib/requestSecurity";
import { NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/projectCatalog";
import { requireAdminMutation } from "@/lib/requestSecurity";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Public: list all projects
export async function GET(request: Request) {
  try {
    const admin = new URL(request.url).searchParams.get("admin") === "true";
    if (admin) {
      const denied = await requireAdminApi();
      if (denied) return denied;
    }
    return NextResponse.json(await listProjects(admin), {
      headers: admin ? PRIVATE_API_HEADERS : {},
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 },
    );
  }
}

// Protected: create a project
export async function POST(request: Request) {
  try {
    const denied = await requireAdminMutation(request);
    if (denied) return denied;

    return NextResponse.json(
      await createProject(await readJson(request), await cmsActor()),
      {
        status: 201,
      },
    );
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
