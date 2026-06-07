export type AllowedImageMime =
  | "image/png"
  | "image/jpeg"
  | "image/webp"
  | "image/gif";

export interface DetectedImageType {
  mime: AllowedImageMime;
  extension: "png" | "jpg" | "webp" | "gif";
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

export function detectImageType(
  bytes: Uint8Array,
): DetectedImageType | null {
  if (
    bytes.length >= 8 &&
    startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  ) {
    return { mime: "image/png", extension: "png" };
  }

  if (
    bytes.length >= 3 &&
    startsWith(bytes, [0xff, 0xd8, 0xff])
  ) {
    return { mime: "image/jpeg", extension: "jpg" };
  }

  if (
    bytes.length >= 12 &&
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(bytes.subarray(8), [0x57, 0x45, 0x42, 0x50])
  ) {
    return { mime: "image/webp", extension: "webp" };
  }

  if (
    bytes.length >= 6 &&
    (startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
      startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))
  ) {
    return { mime: "image/gif", extension: "gif" };
  }

  return null;
}
