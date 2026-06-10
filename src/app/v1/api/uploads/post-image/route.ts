import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { POST_IMAGE_UPLOAD_DIRECTORY } from "@/lib/postImageStorage";
import { requireAdminMutation } from "@/lib/requestSecurity";
import {
  detectImageType,
  type DetectedImageType,
} from "@/lib/imageValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_FILES_PER_REQUEST = 5;
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export async function POST(request: Request) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;

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
  const preparedFiles: {
    bytes: Uint8Array;
    type: DetectedImageType;
  }[] = [];

  for (const file of files) {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Use PNG, JPG, or WEBP images only." }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "Each image must be between 1 byte and 10 MB." }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = detectImageType(bytes);
    if (!type || type.mime !== file.type || type.mime === "image/gif") {
      return NextResponse.json(
        { error: "Image bytes do not match the declared PNG, JPG, or WEBP type." },
        { status: 400 },
      );
    }

    preparedFiles.push({ bytes, type });
  }

  const directory = path.resolve(
    /* turbopackIgnore: true */ POST_IMAGE_UPLOAD_DIRECTORY,
  );
  await mkdir(
    /* turbopackIgnore: true */ directory,
    { recursive: true },
  );
  const paths: string[] = [];
  const urls: string[] = [];

  try {
    for (const prepared of preparedFiles) {
      const filename =
        `${Date.now()}-${randomUUID()}.${prepared.type.extension}`;
      const filePath = path.join(
        /* turbopackIgnore: true */ directory,
        filename,
      );
      await writeFile(
        /* turbopackIgnore: true */ filePath,
        prepared.bytes,
      );
      paths.push(filePath);
      urls.push(`/v1/uploads/posts/${filename}`);
    }
    return NextResponse.json(urls.length === 1 ? { url: urls[0], urls } : { urls });
  } catch (error) {
    await Promise.allSettled(
      paths.map((filePath) =>
        unlink(/* turbopackIgnore: true */ filePath),
      ),
    );
    console.error("[api/uploads/post-image] upload error:", error);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
