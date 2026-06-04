export type PublicTransitionIntent =
  | "section"
  | "drill-in"
  | "drill-out"
  | "sibling-next"
  | "sibling-prev"
  | "utility";

export type SharedElementKind =
  | "project-title"
  | "project-marker"
  | "post-title"
  | "post-cover";

export const TRANSITION_TYPES = {
  sectionForward: "editorial-section-forward",
  sectionBack: "editorial-section-back",
  drillIn: "editorial-drill-in",
  drillOut: "editorial-drill-out",
  siblingNext: "editorial-sibling-next",
  siblingPrev: "editorial-sibling-prev",
  utility: "editorial-utility",
  skip: "editorial-skip",
} as const;

const PUBLIC_SECTIONS = ["/", "/projects", "/blog", "/about", "/contact"] as const;
const PUBLIC_UTILITY_PATHS = new Set(["/privacy", "/terms"]);

function pathOnly(value: string): string {
  const path = value.split(/[?#]/, 1)[0] || "/";
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

export function publicSectionForPath(value: string): string | null {
  const path = pathOnly(value);

  if (path === "/") return "/";
  if (path === "/projects" || path.startsWith("/projects/")) return "/projects";
  if (path === "/blog" || path.startsWith("/blog/")) return "/blog";
  if (path === "/about") return "/about";
  if (path === "/contact") return "/contact";
  if (PUBLIC_UTILITY_PATHS.has(path)) return path;

  return null;
}

export function isPublicTransitionPath(value: string): boolean {
  return publicSectionForPath(value) !== null;
}

export function transitionTypesForNavigation({
  currentPath,
  href,
  intent,
}: {
  currentPath: string;
  href: string;
  intent: PublicTransitionIntent;
}): string[] {
  const from = publicSectionForPath(currentPath);
  const to = publicSectionForPath(href);

  if (!from || !to || pathOnly(currentPath) === pathOnly(href)) {
    return [TRANSITION_TYPES.skip];
  }

  if (intent === "drill-in") return [TRANSITION_TYPES.drillIn];
  if (intent === "drill-out") return [TRANSITION_TYPES.drillOut];
  if (intent === "sibling-next") return [TRANSITION_TYPES.siblingNext];
  if (intent === "sibling-prev") return [TRANSITION_TYPES.siblingPrev];
  if (intent === "utility") return [TRANSITION_TYPES.utility];

  const fromIndex = PUBLIC_SECTIONS.indexOf(from as (typeof PUBLIC_SECTIONS)[number]);
  const toIndex = PUBLIC_SECTIONS.indexOf(to as (typeof PUBLIC_SECTIONS)[number]);

  if (fromIndex < 0 || toIndex < 0) {
    return [TRANSITION_TYPES.utility];
  }

  return [
    toIndex >= fromIndex
      ? TRANSITION_TYPES.sectionForward
      : TRANSITION_TYPES.sectionBack,
  ];
}

export function sharedElementName(kind: SharedElementKind, key: string): string {
  const normalizedKey = key
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `editorial-${kind}-${normalizedKey || "item"}`;
}
