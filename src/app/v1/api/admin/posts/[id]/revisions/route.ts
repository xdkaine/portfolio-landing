import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi, requireAdminMutation } from "@/lib/requestSecurity";
import {
  cmsActor,
  cmsErrorResponse,
  PRIVATE_API_HEADERS,
  readJson,
} from "@/lib/cmsServer";
import { CmsError, requireVersion } from "@/lib/cmsRules";
import { restorePostRevision } from "@/lib/postEditorial";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    const { id } = await params;
    return NextResponse.json(
      await prisma.postRevision.findMany({
        where: { postId: id },
        orderBy: { version: "desc" },
        take: 50,
        select: { id: true, version: true, actor: true, createdAt: true },
      }),
      { headers: PRIVATE_API_HEADERS },
    );
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
export async function POST(request: Request, { params }: Context) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;
  try {
    const { id } = await params;
    const body = (await readJson(request)) as {
      version?: unknown;
      revision?: unknown;
    };
    if (!Number.isSafeInteger(body.revision) || Number(body.revision) < 1)
      throw new CmsError("Choose a valid revision");
    return NextResponse.json(
      await restorePostRevision(
        id,
        requireVersion(body),
        Number(body.revision),
        await cmsActor(),
      ),
    );
  } catch (error) {
    return cmsErrorResponse(error);
  }
}
