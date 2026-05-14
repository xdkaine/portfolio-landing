import {
  DEFAULT_SITE_SETTINGS,
  type SiteSettings,
} from "@/lib/siteSettings-schema";

export interface Project {
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
  content?: string;
  date: string;
  readTime: string;
  tags: string[];
  published: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContactMsg {
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
}

export type EditableProject = Partial<Project> & { id?: string };
export type EditablePost = Partial<Post> & { id?: string };

export async function fetchAdminDashboardData(): Promise<AdminDashboardData> {
  const [
    projectsResponse,
    postsResponse,
    messagesResponse,
    settingsResponse,
    linkClicksResponse,
  ] = await Promise.all([
    fetch("/api/projects"),
    fetch("/api/posts?all=true"),
    fetch("/api/contact"),
    fetch("/api/settings?all=true"),
    fetch("/api/analytics/link-click"),
  ]);

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
    projects: Array.isArray(projectsPayload) ? projectsPayload as Project[] : [],
    posts: Array.isArray(postsPayload) ? postsPayload as Post[] : [],
    messages: Array.isArray(messagesPayload) ? messagesPayload as ContactMsg[] : [],
    settings:
      settingsPayload && typeof settingsPayload === "object"
        ? { ...DEFAULT_SITE_SETTINGS, ...(settingsPayload as Partial<SiteSettings>) }
        : DEFAULT_SITE_SETTINGS,
    linkClicks:
      linkClicksPayload && typeof linkClicksPayload === "object"
        ? Array.isArray((linkClicksPayload as { items?: unknown }).items)
          ? (linkClicksPayload as { items: LinkClickMetric[] }).items
          : []
        : [],
  };
}

export async function saveProjectRecord(project: EditableProject): Promise<boolean> {
  const method = project.id ? "PUT" : "POST";
  const url = project.id ? `/api/projects/${project.id}` : "/api/projects";
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(project),
  });
  return response.ok;
}

export async function deleteProjectRecord(id: string): Promise<boolean> {
  const response = await fetch(`/api/projects/${id}`, { method: "DELETE" });
  return response.ok;
}

export async function savePostRecord(post: EditablePost): Promise<boolean> {
  const method = post.id ? "PUT" : "POST";
  const url = post.id ? `/api/posts/${post.id}` : "/api/posts";
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(post),
  });
  return response.ok;
}

export async function deletePostRecord(id: string): Promise<boolean> {
  const response = await fetch(`/api/posts/${id}`, { method: "DELETE" });
  return response.ok;
}

export async function saveSiteSettings(settings: SiteSettings): Promise<{
  ok: boolean;
  settings?: SiteSettings;
  error?: string;
}> {
  const response = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as {
      error?: string;
    };
    return {
      ok: false,
      error: payload.error || "Failed to update settings.",
    };
  }

  return {
    ok: true,
    settings: await response.json() as SiteSettings,
  };
}
