const LEGACY_PUBLIC_PREFIXES = [
  ["/uploads/posts/", "/v1/uploads/posts/"],
  ["/uploads/projects/", "/v1/uploads/projects/"],
] as const;
const PROJECT_ASSET_PATH =
  /^\/projects\/.+\.(?:avif|gif|jpe?g|png|svg|webp)$/i;

export function normalizeV1PublicUrl(value: string): string {
  const trimmed = value.trim();

  for (const [legacyPrefix, v1Prefix] of LEGACY_PUBLIC_PREFIXES) {
    if (trimmed.startsWith(legacyPrefix)) {
      return `${v1Prefix}${trimmed.slice(legacyPrefix.length)}`;
    }
  }

  if (PROJECT_ASSET_PATH.test(trimmed)) {
    return `/v1/assets${trimmed}`;
  }

  return trimmed;
}
