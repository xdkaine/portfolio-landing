import { cmsActor, PRIVATE_API_HEADERS } from "@/lib/cmsServer";
import { NextResponse } from "next/server";
import { createDraftPost, listAdminPosts } from "@/lib/postEditorial";
import { requireAdminApi, requireAdminMutation } from "@/lib/requestSecurity";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;

  try {
    return NextResponse.json(await listAdminPosts(), {
      headers: PRIVATE_API_HEADERS,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;

  try {
    return NextResponse.json(await createDraftPost(await cmsActor()), {
      status: 201,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to create draft" },
      { status: 500 },
    );
  }
}
