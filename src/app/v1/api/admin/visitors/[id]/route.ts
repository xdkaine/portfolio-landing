import { NextResponse } from "next/server";
import { requireAdminApi, requireAdminMutation } from "@/lib/requestSecurity";
import { getVisitor, setVisitorQa } from "@/lib/visitorStore";
import { cmsActor, readJson, cmsErrorResponse, PRIVATE_API_HEADERS } from "@/lib/cmsServer";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;
  try {
    const body = await readJson(request, 1024) as { isQa?: unknown; expectedIsQa?: unknown };
    if (typeof body?.isQa !== "boolean" || typeof body?.expectedIsQa !== "boolean")
      return NextResponse.json({ error: "Current and new QA classifications are required" }, { status: 400, headers: PRIVATE_API_HEADERS });
    await setVisitorQa((await params).id, body.isQa, body.expectedIsQa, await cmsActor());
    return NextResponse.json({ ok: true }, { headers: PRIVATE_API_HEADERS });
  } catch (error) { return cmsErrorResponse(error); }
}
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
