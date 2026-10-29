import { NextResponse } from "next/server";
import { requireAdminApi, requireAdminMutation } from "@/lib/requestSecurity";
import {
  cmsActor,
  cmsErrorResponse,
  PRIVATE_API_HEADERS,
  readJson,
} from "@/lib/cmsServer";
import { listMessages, updateMessages } from "@/lib/messageInbox";
export async function GET(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    return NextResponse.json(
      await listMessages(new URL(request.url).searchParams),
      { headers: PRIVATE_API_HEADERS },
    );
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
export async function PATCH(request: Request) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;
  try {
    return NextResponse.json(
      await updateMessages(await readJson(request, 24000), await cmsActor()),
    );
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
