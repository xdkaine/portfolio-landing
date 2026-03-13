import { NextResponse } from "next/server";
import { readProjectImage } from "@/lib/projectImageStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  const image = await readProjectImage(filename);

  if (!image) {
    return new NextResponse("Not found", { status: 404 });
  }

  const body = new Uint8Array(image.bytes);

  return new NextResponse(body, {
    headers: {
      "Content-Type": image.contentType,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
