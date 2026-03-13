import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { PROJECT_IMAGE_UPLOAD_DIRECTORY } from "@/lib/projectImageStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

export async function POST(request: Request) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "File is empty" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File too large. Max size is 10MB." },
        { status: 400 },
      );
    }

    const extension = MIME_TO_EXTENSION[file.type];
    if (!extension) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Allowed: PNG, JPG, WEBP, GIF, SVG.",
        },
        { status: 400 },
      );
    }

    const uploadDirectory = path.resolve(PROJECT_IMAGE_UPLOAD_DIRECTORY);
    await mkdir(uploadDirectory, { recursive: true });

    const safeName = `${Date.now()}-${randomUUID()}.${extension}`;
    const filePath = path.join(uploadDirectory, safeName);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    return NextResponse.json({
      url: `/uploads/projects/${safeName}`,
    });
  } catch (error) {
    console.error("[api/uploads/project-image] POST error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
