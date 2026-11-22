import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/requestSecurity";
import { getVisitor } from "@/lib/visitorStore";
import { cmsErrorResponse, PRIVATE_API_HEADERS } from "@/lib/cmsServer";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    const { id } = await params;
    const result = await getVisitor(id);
    return result
      ? NextResponse.json(result, { headers: PRIVATE_API_HEADERS })
      : NextResponse.json(
          { error: "Visitor not found or expired" },
          { status: 404, headers: PRIVATE_API_HEADERS },
        );
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
