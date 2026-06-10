import { NextResponse } from "next/server";
import { readPostImage } from "@/lib/postImageStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  const image = await readPostImage(filename);
  if (!image) return new NextResponse("Not found", { status: 404 });

  const bytes = new Uint8Array(image.bytes);
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": image.contentType,
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
