import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { POST_IMAGE_UPLOAD_DIRECTORY } from "@/lib/postImageStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_FILES_PER_REQUEST = 5;
const MIME_TO_EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  if (!(await verifySession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let data: FormData;
  try {
    data = await request.formData();
  } catch {
    return NextResponse.json({ error: "Upload valid form data." }, { status: 400 });
  }
  const files = [
    data.get("file"),
    ...data.getAll("files"),
  ].filter((value): value is File => value instanceof File);

  if (files.length === 0 || files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json({ error: "Upload between 1 and 5 images." }, { status: 400 });
  }
  for (const file of files) {
    if (!MIME_TO_EXTENSION[file.type]) {
      return NextResponse.json({ error: "Use PNG, JPG, or WEBP images only." }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "Each image must be between 1 byte and 10 MB." }, { status: 400 });
    }
  }

  const directory = path.resolve(POST_IMAGE_UPLOAD_DIRECTORY);
  await mkdir(directory, { recursive: true });
  const paths: string[] = [];
  const urls: string[] = [];

  try {
    for (const file of files) {
      const filename = `${Date.now()}-${randomUUID()}.${MIME_TO_EXTENSION[file.type]}`;
      const filePath = path.join(directory, filename);
      await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
      paths.push(filePath);
      urls.push(`/uploads/posts/${filename}`);
    }
    return NextResponse.json(urls.length === 1 ? { url: urls[0], urls } : { urls });
  } catch (error) {
    await Promise.allSettled(paths.map((filePath) => unlink(filePath)));
    console.error("[api/uploads/post-image] upload error:", error);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
