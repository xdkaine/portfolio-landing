import {
  DEFAULT_SITE_SETTINGS,
  type SiteSettings,
} from "@/lib/siteSettings-schema";
import type { PostDocument } from "@/lib/postContent";

export interface Project {
  version: number;
  deletedAt?: string | null;
  id: string;
  number: string;
  title: string;
  description: string;
  tags: string[];
  year: string;
  url?: string;
  github?: string;
  status: string;
  featured: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
  caseStudy?: {
    subtitle?: string;
    pitch?: string;
    role?: string;
    timeline?: string;
    challenge?: string;
    concept?: string;
    writeupMarkdown?: string;
    writeup?: string[];
    highlights?: string[];
    demoSummary?: string;
    demoUrl?: string;
    repoUrl?: string;
    gallery?: {
      title: string;
      caption: string;
      image: string;
      alt: string;
    }[];
  } | null;
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content?: string | null;
  bodyJson?: PostDocument | null;
  date: string;
  readTime: string;
  tags: string[];
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  published: boolean;
  publishedAt?: string | null;
  coverImage?: string | null;
  coverAlt?: string | null;
  featured: boolean;
  version: number;
  deletedAt?: string | null;
  hasUnpublishedChanges?: boolean;
  needsContent?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContactMsg {
  status: "NEW" | "OPEN" | "RESOLVED" | "ARCHIVED";
  version: number;
  note: string;
  id: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface LinkClickMetric {
  key: string;
  destination: string;
  sourcePath: string;
  label: string;
  external: boolean;
  count: number;
  firstClickedAt: string;
  lastClickedAt: string;
}

export interface AdminDashboardData {
  projects: Project[];
  posts: Post[];
  messages: ContactMsg[];
  settings: SiteSettings;
  linkClicks: LinkClickMetric[];
  unreadMessages: number;
  activeMessages: number;
}

export type EditableProject = Partial<Project> & { id?: string };

export async function fetchAdminDashboardData(): Promise<AdminDashboardData> {
  const [
    projectsResponse,
    postsResponse,
    messagesResponse,
    settingsResponse,
    linkClicksResponse,
  ] = await Promise.all([
    fetch("/v1/api/projects?admin=true"),
    fetch("/v1/api/admin/posts"),
    fetch("/v1/api/admin/messages"),
    fetch("/v1/api/settings?all=true"),
    fetch("/v1/api/analytics/link-click"),
  ]);

  const responses = [
    projectsResponse,
    postsResponse,
    messagesResponse,
    settingsResponse,
    linkClicksResponse,
  ];
  const names = [
    "projects",
    "posts",
    "inbox",
    "settings",
    "historical metrics",
  ];
  const failed = responses.findIndex((response) => !response.ok);
  if (failed >= 0)
    throw new Error(
      responses[failed].status === 401
        ? "Your session expired. Sign in again."
        : `Could not load ${names[failed]}. Refresh to retry.`,
    );
  const [
    projectsPayload,
    postsPayload,
    messagesPayload,
    settingsPayload,
    linkClicksPayload,
  ] = await Promise.all([
    projectsResponse.ok ? projectsResponse.json() : Promise.resolve(null),
    postsResponse.ok ? postsResponse.json() : Promise.resolve(null),
    messagesResponse.ok ? messagesResponse.json() : Promise.resolve(null),
    settingsResponse.ok ? settingsResponse.json() : Promise.resolve(null),
    linkClicksResponse.ok ? linkClicksResponse.json() : Promise.resolve(null),
  ]);

  return {
    projects: Array.isArray(projectsPayload)
      ? (projectsPayload as Project[])
      : [],
    posts: Array.isArray(postsPayload) ? (postsPayload as Post[]) : [],
    messages: messagesPayload?.items ?? [],
    unreadMessages: messagesPayload?.unread ?? 0,
    activeMessages: messagesPayload?.active ?? 0,
    settings:
      settingsPayload && typeof settingsPayload === "object"
        ? {
            ...DEFAULT_SITE_SETTINGS,
            ...(settingsPayload as Partial<SiteSettings>),
          }
        : DEFAULT_SITE_SETTINGS,
    linkClicks:
      linkClicksPayload && typeof linkClicksPayload === "object"
        ? Array.isArray((linkClicksPayload as { items?: unknown }).items)
          ? (linkClicksPayload as { items: LinkClickMetric[] }).items
          : []
        : [],
  };
}

export async function saveProjectRecord(project: EditableProject): Promise<{
  ok: boolean;
  error?: string;
}> {
  const method = project.id ? "PUT" : "POST";
  const url = project.id
    ? `/v1/api/projects/${project.id}`
    : "/v1/api/projects";
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(project),
  });
  if (response.ok) {
    return { ok: true };
  }

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  };
  return {
    ok: false,
    error: payload.error || "Failed to save project.",
  };
}

export async function deleteProjectRecord(
  id: string,
  version: number,
): Promise<boolean> {
  const response = await fetch(`/v1/api/projects/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version }),
  });
  return response.ok;
}

export async function saveSiteSettings(
  settings: SiteSettings & { _version?: number },
): Promise<{
  ok: boolean;
  settings?: SiteSettings;
  error?: string;
}> {
  const response = await fetch("/v1/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...settings, version: settings._version }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    return {
      ok: false,
      error: payload.error || "Failed to update settings.",
    };
  }

  return {
    ok: true,
    settings: (await response.json()) as SiteSettings,
  };
}
