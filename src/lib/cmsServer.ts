import { NextResponse } from "next/server";
import { verifySession } from "./auth";
import { CmsError } from "./cmsRules";

export async function cmsActor() {
  const session = await verifySession();
  if (!session || session.role !== "ADMIN")
    throw new CmsError("Unauthorized", 401);
  return session.name || session.email;
}
export async function readJson(
  request: Request,
  maximum = 1_000_000,
): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > maximum)
    throw new CmsError("Request body is too large", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new CmsError("A JSON request body is required");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maximum) {
      await reader.cancel();
      throw new CmsError("Request body is too large", 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new CmsError("Invalid JSON request body");
  }
}
export function cmsErrorResponse(error: unknown) {
  if (
    error instanceof CmsError ||
    (error instanceof Error &&
      "status" in error &&
      typeof error.status === "number")
  ) {
    return NextResponse.json(
      { error: error.message },
      { status: (error as CmsError).status },
    );
  }
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "P2002"
  )
    return NextResponse.json(
      { error: "That URL slug is already in use. Choose a different slug." },
      { status: 409 },
    );
  console.error(
    "CMS request failed",
    error instanceof Error ? error.name : "Unknown error",
  );
  return NextResponse.json(
    {
      error:
        "The operation failed. Your saved data has been preserved; please retry.",
    },
    { status: 500 },
  );
}
export const PRIVATE_API_HEADERS = { "Cache-Control": "private, no-store" };
