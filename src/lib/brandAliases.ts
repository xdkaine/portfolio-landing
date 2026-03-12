const FALLBACK_ALIASES = ["Kaine", "Tommy"];

export function parseBrandAliases(raw: string | null | undefined): string[] {
  if (!raw || typeof raw !== "string") {
    return [...FALLBACK_ALIASES];
  }

  const normalized = raw
    .replace(/\s+or\s+/gi, ",")
    .replace(/[|/]/g, ",");

  const aliases = Array.from(
    new Set(
      normalized
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => part.slice(0, 40)),
    ),
  );

  return aliases.length > 0 ? aliases : [...FALLBACK_ALIASES];
}
