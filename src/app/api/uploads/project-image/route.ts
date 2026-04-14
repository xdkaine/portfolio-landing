import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { PROJECT_IMAGE_UPLOAD_DIRECTORY } from "@/lib/projectImageStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_FILES_PER_REQUEST = 5;

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

/**
 * Attempt to remove a list of files that were already written to disk.
 * Best-effort: individual failures are silently ignored since the upload
 * is already being reported as failed.
 */
async function rollbackFiles(filePaths: string[]): Promise<void> {
  await Promise.allSettled(filePaths.map((fp) => unlink(fp)));
}

export async function POST(request: Request) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();

    // Support both single-file ("file") and multi-file ("files") field names.
    const files: File[] = [];
    const singleFile = formData.get("file");
    if (singleFile instanceof File) {
      files.push(singleFile);
    }
    for (const entry of formData.getAll("files")) {
      if (entry instanceof File) {
        files.push(entry);
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        { error: `Too many files. Maximum is ${MAX_FILES_PER_REQUEST} per request.` },
        { status: 400 },
      );
    }

    // Validate every file before writing any to disk.
    for (const file of files) {
      if (file.size <= 0) {
        return NextResponse.json({ error: "One or more files are empty" }, { status: 400 });
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File "${file.name}" is too large. Max size is 10 MB.` },
          { status: 400 },
        );
      }
      if (!MIME_TO_EXTENSION[file.type]) {
        return NextResponse.json(
          { error: `File "${file.name}" has an unsupported type. Allowed: PNG, JPG, WEBP, GIF, SVG.` },
          { status: 400 },
        );
      }
    }

    const uploadDirectory = path.resolve(PROJECT_IMAGE_UPLOAD_DIRECTORY);
    await mkdir(uploadDirectory, { recursive: true });

    const writtenPaths: string[] = [];
    const urls: string[] = [];

    try {
      for (const file of files) {
        const extension = MIME_TO_EXTENSION[file.type];
        const safeName = `${Date.now()}-${randomUUID()}.${extension}`;
        const filePath = path.join(uploadDirectory, safeName);
        const bytes = await file.arrayBuffer();
        await writeFile(filePath, Buffer.from(bytes));
        writtenPaths.push(filePath);
        urls.push(`/uploads/projects/${safeName}`);
      }
    } catch (writeError) {
      // Roll back any files that were successfully written before the failure.
      await rollbackFiles(writtenPaths);
      console.error("[api/uploads/project-image] write error, rolled back:", writeError);
      return NextResponse.json({ error: "Upload failed – all files rolled back." }, { status: 500 });
    }

    // Single-file requests return the legacy `{ url }` shape for backward compat.
    if (urls.length === 1) {
      return NextResponse.json({ url: urls[0], urls });
    }

    return NextResponse.json({ urls });
  } catch (error) {
    console.error("[api/uploads/project-image] POST error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
