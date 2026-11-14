export type DisplayProjectStatus = "LIVE" | "IN PROGRESS" | "ARCHIVED";

interface ProjectAction {
  href: string;
  label: string;
  kind: "source" | "demo";
}

export function getProjectActions(demoUrl?: string | null, repoUrl?: string | null): ProjectAction[] {
  const parse = (value?: string | null) => {
    try {
      const url = new URL(value ?? "");
      return ["https:", "http:"].includes(url.protocol) ? url : null;
    } catch { return null; }
  };
  const demo = parse(demoUrl);
  const source = parse(repoUrl);
  const destination = (url: URL) => `${url.origin}${url.pathname.replace(/\/$/, "")}${url.search}`;
  const actions: ProjectAction[] = source ? [{ href: source.href, label: "View source", kind: "source" }] : [];
  if (demo && (!source || destination(demo) !== destination(source))) {
    const repository = ["github.com", "gitlab.com", "codeberg.org"].includes(demo.hostname);
    actions.unshift({ href: demo.href, label: repository ? source ? "Related repository" : "View source" : "Open demo", kind: repository ? "source" : "demo" });
  }
  return actions;
}

export function normalizeProjectStatus(status: unknown): DisplayProjectStatus {
  if (status === "IN_PROGRESS" || status === "IN PROGRESS") {
    return "IN PROGRESS";
  }
  if (status === "ARCHIVED") {
    return "ARCHIVED";
  }
  return "LIVE";
}

export function compareProjectNumbers(a: string, b: string): number {
  return a.localeCompare(b, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function toTimestamp(value?: string | Date): number {
  if (!value) return 0;

  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function compareProjectsByDisplayOrder(
  a: { sortOrder: number; createdAt?: string | Date; number: string },
  b: { sortOrder: number; createdAt?: string | Date; number: string },
): number {
  const sortOrderDifference = a.sortOrder - b.sortOrder;
  if (sortOrderDifference !== 0) {
    return sortOrderDifference;
  }

  const createdAtDifference = toTimestamp(a.createdAt) - toTimestamp(b.createdAt);
  if (createdAtDifference !== 0) {
    return createdAtDifference;
  }

  return compareProjectNumbers(a.number, b.number);
}
