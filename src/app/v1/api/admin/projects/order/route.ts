import { NextResponse } from "next/server";
import { requireAdminMutation } from "@/lib/requestSecurity";
import { cmsActor, cmsErrorResponse, readJson } from "@/lib/cmsServer";
import { reorderProjects } from "@/lib/projectCatalog";
export async function PUT(request: Request) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;
  try {
    const body = (await readJson(request)) as {
      records: { id: string; version: number }[];
    };
    await reorderProjects(body.records, await cmsActor());
    return NextResponse.json({ success: true });
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
