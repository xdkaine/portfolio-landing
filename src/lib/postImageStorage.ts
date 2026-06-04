import path from "node:path";
import { readFile } from "node:fs/promises";

const configuredUploadDirectory = process.env.POST_IMAGE_UPLOAD_DIR?.trim();
const DEFAULT_UPLOAD_DIRECTORY = path.join(process.cwd(), "public", "uploads", "posts");
const ALTERNATE_UPLOAD_DIRECTORY = path.join(process.cwd(), "uploads", "posts");
const LEGACY_PUBLIC_UPLOAD_DIRECTORY = path.join(process.cwd(), "legacy-public", "uploads", "posts");

export const POST_IMAGE_UPLOAD_DIRECTORY =
  configuredUploadDirectory && configuredUploadDirectory.length > 0
    ? path.resolve(configuredUploadDirectory)
    : DEFAULT_UPLOAD_DIRECTORY;

const IMAGE_EXTENSION_TO_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};
const SAFE_FILENAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function resolveSafeFilePath(directory: string, filename: string): string | null {
  if (!SAFE_FILENAME_PATTERN.test(filename)) return null;
  const normalizedDirectory = path.resolve(directory);
  const filePath = path.resolve(normalizedDirectory, filename);
  return filePath.startsWith(`${normalizedDirectory}${path.sep}`) ? filePath : null;
}

export async function readPostImage(filename: string) {
  const contentType = IMAGE_EXTENSION_TO_MIME[path.extname(filename).toLowerCase()];
  if (!contentType) return null;

  const directories = [
    POST_IMAGE_UPLOAD_DIRECTORY,
    DEFAULT_UPLOAD_DIRECTORY,
    ALTERNATE_UPLOAD_DIRECTORY,
    LEGACY_PUBLIC_UPLOAD_DIRECTORY,
  ]
    .map((directory) => path.resolve(directory))
    .filter((directory, index, all) => all.indexOf(directory) === index);

  for (const directory of directories) {
    const filePath = resolveSafeFilePath(directory, filename);
    if (!filePath) return null;
    try {
      return { contentType, bytes: await readFile(filePath) };
    } catch {
      // Continue searching storage fallbacks.
    }
  }
  return null;
}
