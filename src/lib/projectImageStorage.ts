import path from "node:path";
import { readFile } from "node:fs/promises";

const configuredUploadDirectory = process.env.PROJECT_IMAGE_UPLOAD_DIR?.trim();

const DEFAULT_UPLOAD_DIRECTORY = path.join(
  process.cwd(),
  "public",
  "uploads",
  "projects",
);
const ALTERNATE_UPLOAD_DIRECTORY = path.join(
  process.cwd(),
  "uploads",
  "projects",
);

export const PROJECT_IMAGE_UPLOAD_DIRECTORY =
  configuredUploadDirectory && configuredUploadDirectory.length > 0
    ? path.resolve(configuredUploadDirectory)
    : DEFAULT_UPLOAD_DIRECTORY;

const IMAGE_EXTENSION_TO_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

const SAFE_FILENAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function resolveSafeFilePath(
  directory: string,
  filename: string,
): string | null {
  if (!SAFE_FILENAME_PATTERN.test(filename)) {
    return null;
  }

  const normalizedDirectory = path.resolve(directory);
  const resolvedFilePath = path.resolve(normalizedDirectory, filename);
  if (!resolvedFilePath.startsWith(`${normalizedDirectory}${path.sep}`)) {
    return null;
  }

  return resolvedFilePath;
}

function getContentType(filename: string): string | null {
  const extension = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSION_TO_MIME[extension] ?? null;
}

function getReadDirectories(): string[] {
  const primaryDirectory = path.resolve(PROJECT_IMAGE_UPLOAD_DIRECTORY);
  const fallbackDirectories = [DEFAULT_UPLOAD_DIRECTORY, ALTERNATE_UPLOAD_DIRECTORY]
    .map((directory) => path.resolve(directory))
    .filter((directory, index, array) => array.indexOf(directory) === index);
  return [primaryDirectory, ...fallbackDirectories].filter(
    (directory, index, array) => array.indexOf(directory) === index,
  );
}

export async function readProjectImage(
  filename: string,
): Promise<{ contentType: string; bytes: Buffer } | null> {
  const contentType = getContentType(filename);
  if (!contentType) {
    return null;
  }

  for (const directory of getReadDirectories()) {
    const filePath = resolveSafeFilePath(directory, filename);
    if (!filePath) {
      return null;
    }

    try {
      const bytes = await readFile(filePath);
      return { contentType, bytes };
    } catch {
      // Continue searching fallback directories.
    }
  }

  return null;
}
