import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/requestSecurity";
import { listVisitors } from "@/lib/visitorStore";
import { cmsErrorResponse, PRIVATE_API_HEADERS } from "@/lib/cmsServer";
export async function GET(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    return NextResponse.json(
      await listVisitors(new URL(request.url).searchParams),
      { headers: PRIVATE_API_HEADERS },
    );
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
