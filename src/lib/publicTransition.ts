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

export const PUBLIC_NAVIGATION = [
  { href: "/v1", label: "Home" },
  { href: "/v1/projects", label: "PROJECTS" },
  { href: "/v1/blog", label: "BLOG" },
  { href: "/v1/about", label: "ABOUT" },
  { href: "/v1/contact", label: "CONTACT" },
] as const;
const PUBLIC_SECTIONS = PUBLIC_NAVIGATION.map(item => item.href);
const PUBLIC_UTILITY_PATHS = new Set(["/v1/privacy", "/v1/terms"]);

function pathOnly(value: string): string {
  const path = value.split(/[?#]/, 1)[0] || "/";
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

export function publicSectionForPath(value: string): string | null {
  const path = pathOnly(value);

  if (path === "/v1") return "/v1";
  if (path === "/v1/projects" || path.startsWith("/v1/projects/")) return "/v1/projects";
  if (path === "/v1/blog" || path.startsWith("/v1/blog/")) return "/v1/blog";
  if (path === "/v1/about") return "/v1/about";
  if (path === "/v1/contact") return "/v1/contact";
  if (PUBLIC_UTILITY_PATHS.has(path)) return path;

  return null;
}

export function isPublicTransitionPath(value: string): boolean {
  return publicSectionForPath(value) !== null;
}

export type PublicEntranceDirection = "initial" | "from-left" | "from-right";

export function entranceDirectionForNavigation(fromPath: string | null, toPath: string): PublicEntranceDirection {
  if (!fromPath || pathOnly(fromPath) === pathOnly(toPath)) return "initial";
  const from = publicSectionForPath(fromPath);
  const to = publicSectionForPath(toPath);
  if (!from || !to) return "initial";
  const fromIndex = PUBLIC_SECTIONS.indexOf(from as (typeof PUBLIC_SECTIONS)[number]);
  const toIndex = PUBLIC_SECTIONS.indexOf(to as (typeof PUBLIC_SECTIONS)[number]);
  if (fromIndex < 0 || toIndex < 0) return "initial";
  if (fromIndex === toIndex) return pathOnly(toPath) === to ? "from-right" : "from-left";
  return toIndex < fromIndex ? "from-right" : "from-left";
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
