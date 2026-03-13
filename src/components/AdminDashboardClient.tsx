"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AdminMetricsDashboard } from "@/components/AdminMetricsDashboard";
import {
  DEFAULT_SITE_SETTINGS,
  type SiteSettings,
} from "@/lib/siteSettings-schema";

// Client-side models mirror the payload shapes returned by admin APIs.

interface Project {
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
    // Backward compatibility for legacy payloads.
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

interface Post {
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

interface ContactMsg {
  id: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface LinkClickMetric {
  key: string;
  destination: string;
  sourcePath: string;
  label: string;
  external: boolean;
  count: number;
  firstClickedAt: string;
  lastClickedAt: string;
}

type Tab = "metrics" | "projects" | "posts" | "messages" | "settings";

export default function AdminDashboardClient() {
  const router = useRouter();
  const isMountedRef = useRef(true);
  const [tab, setTab] = useState<Tab>("metrics");
  const [projects, setProjects] = useState<Project[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [messages, setMessages] = useState<ContactMsg[]>([]);
  const [linkClicks, setLinkClicks] = useState<LinkClickMetric[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState("");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);

  // Shared unmount guard for async callbacks (fetching + save actions).
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load all dashboard datasets in parallel so tab counts and lists stay in sync.
  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) {
      return;
    }

    setLoading(true);
    try {
      const [projectsResponse, postsResponse, messagesResponse, settingsResponse, linkClicksResponse] =
        await Promise.all([
          fetch("/api/projects"),
          fetch("/api/posts?all=true"),
          fetch("/api/contact"),
          fetch("/api/settings?all=true"),
          fetch("/api/analytics/link-click"),
        ]);

      // Parse only successful responses to avoid JSON errors from failed requests.
      const [projectsPayload, postsPayload, messagesPayload, settingsPayload, linkClicksPayload] =
        await Promise.all([
          projectsResponse.ok ? projectsResponse.json() : Promise.resolve(null),
          postsResponse.ok ? postsResponse.json() : Promise.resolve(null),
          messagesResponse.ok ? messagesResponse.json() : Promise.resolve(null),
          settingsResponse.ok ? settingsResponse.json() : Promise.resolve(null),
          linkClicksResponse.ok ? linkClicksResponse.json() : Promise.resolve(null),
        ]);

      if (!isMountedRef.current) {
        return;
      }

      if (Array.isArray(projectsPayload)) {
        setProjects(projectsPayload as Project[]);
      }

      if (Array.isArray(postsPayload)) {
        setPosts(postsPayload as Post[]);
      }

      if (Array.isArray(messagesPayload)) {
        setMessages(messagesPayload as ContactMsg[]);
      }

      if (settingsPayload && typeof settingsPayload === "object") {
        const payload = settingsPayload as Partial<SiteSettings>;
        setSettings({ ...DEFAULT_SITE_SETTINGS, ...payload });
      }

      if (linkClicksPayload && typeof linkClicksPayload === "object") {
        const payload = linkClicksPayload as { items?: LinkClickMetric[] };
        setLinkClicks(Array.isArray(payload.items) ? payload.items : []);
      }
    } catch (e) {
      console.error("Failed to fetch:", e);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const updateSetting = useCallback(
    (name: keyof SiteSettings, value: string) => {
      setSettings((prev) => ({ ...prev, [name]: value }));
    },
    [],
  );

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  // Keep form components simple by centralizing create/update/delete here.
  const saveProject = async (project: Partial<Project> & { id?: string }) => {
    const method = project.id ? "PUT" : "POST";
    const url = project.id ? `/api/projects/${project.id}` : "/api/projects";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project),
    });
    if (res.ok) {
      setEditingProject(null);
      setShowNewProject(false);
      await fetchData();
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) {
      await fetchData();
    }
  };

  const savePost = async (post: Partial<Post> & { id?: string }) => {
    const method = post.id ? "PUT" : "POST";
    const url = post.id ? `/api/posts/${post.id}` : "/api/posts";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(post),
    });
    if (res.ok) {
      setEditingPost(null);
      setShowNewPost(false);
      await fetchData();
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
    if (res.ok) {
      await fetchData();
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    setSettingsNotice("");

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setSettingsNotice(payload.error || "Failed to update settings.");
        return;
      }

      const updated = (await res.json()) as SiteSettings;
      setSettings(updated);
      setSettingsNotice("Settings saved.");
    } catch {
      setSettingsNotice("Network error while saving settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const unreadMessagesCount = useMemo(
    () => messages.filter((message) => !message.read).length,
    [messages],
  );

  const tabs = useMemo<{ key: Tab; label: string; count: number }[]>(
    () => [
      {
        key: "metrics",
        label: "METRICS",
        count: projects.length + posts.length + messages.length + linkClicks.length,
      },
      { key: "projects", label: "PROJECTS", count: projects.length },
      { key: "posts", label: "POSTS", count: posts.length },
      { key: "messages", label: "MESSAGES", count: unreadMessagesCount },
      { key: "settings", label: "SETTINGS", count: 1 },
    ],
    [
      linkClicks.length,
      messages.length,
      posts.length,
      projects.length,
      unreadMessagesCount,
    ],
  );

  return (
    <section className="pt-32 pb-24 px-6 md:px-12 lg:px-24 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 text-steel text-[10px] tracking-[0.3em] mb-4">
            <span>{settings.siteName}</span>
            <span>/</span>
            <span className="text-ember">ADMIN</span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl">DASHBOARD</h1>
        </div>
        <button
          onClick={handleLogout}
          className="text-[10px] tracking-[0.2em] text-ash hover:text-ember border border-iron hover:border-ember px-4 py-2 transition-all"
        >
          LOGOUT
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b-2 border-iron mb-8">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-[10px] tracking-[0.2em] px-4 py-3 border-b-2 -mb-[2px] transition-colors ${
              tab === t.key
                ? "border-ember text-ember"
                : "border-transparent text-ash hover:text-bone"
            }`}
          >
            {t.label} ({String(t.count).padStart(2, "0")})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <span className="text-steel text-[10px] tracking-[0.3em]">LOADING...</span>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Metrics */}
            {tab === "metrics" && (
              <AdminMetricsDashboard
                projects={projects}
                posts={posts}
                messages={messages}
                linkClicks={linkClicks}
                settings={settings}
              />
            )}

            {/* Projects */}
            {tab === "projects" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-ash text-xs tracking-[0.1em]">
                    {projects.length} projects
                  </span>
                  <button
                    onClick={() => {
                      setShowNewProject(true);
                      setEditingProject(null);
                    }}
                    className="text-[10px] tracking-[0.2em] text-ember border border-ember px-4 py-2 hover:bg-ember hover:text-void transition-all"
                  >
                    + NEW PROJECT
                  </button>
                </div>

                {(showNewProject || editingProject) && (
                  <ProjectForm
                    key={editingProject?.id ?? "new-project"}
                    project={editingProject}
                    onSave={saveProject}
                    onCancel={() => {
                      setEditingProject(null);
                      setShowNewProject(false);
                    }}
                  />
                )}

                <div className="space-y-1">
                  {projects.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between py-3 border-b border-iron group hover:bg-surface/50 px-2 -mx-2"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <span className="text-iron text-[10px] w-6">{p.number}</span>
                        <span className="text-bone text-sm truncate">{p.title}</span>
                        <span
                          className={`text-[9px] tracking-[0.1em] px-1.5 py-0.5 border ${
                            p.status === "LIVE"
                              ? "text-emerald-400 border-emerald-400/30"
                              : p.status === "IN PROGRESS"
                                ? "text-amber-400 border-amber-400/30"
                                : "text-steel border-iron"
                          }`}
                        >
                          {p.status}
                        </span>
                        {p.featured && (
                          <span className="text-[9px] text-ember tracking-[0.1em]">FEATURED</span>
                        )}
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingProject(p);
                            setShowNewProject(false);
                          }}
                          className="text-[10px] text-ash hover:text-bone px-2 py-1"
                        >
                          EDIT
                        </button>
                        <button
                          onClick={() => deleteProject(p.id)}
                          className="text-[10px] text-ash hover:text-red-400 px-2 py-1"
                        >
                          DELETE
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Posts */}
            {tab === "posts" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-ash text-xs tracking-[0.1em]">
                    {posts.length} posts
                  </span>
                  <button
                    onClick={() => {
                      setShowNewPost(true);
                      setEditingPost(null);
                    }}
                    className="text-[10px] tracking-[0.2em] text-ember border border-ember px-4 py-2 hover:bg-ember hover:text-void transition-all"
                  >
                    + NEW POST
                  </button>
                </div>

                {(showNewPost || editingPost) && (
                  <PostForm
                    key={editingPost?.id ?? "new-post"}
                    post={editingPost}
                    onSave={savePost}
                    onCancel={() => {
                      setEditingPost(null);
                      setShowNewPost(false);
                    }}
                  />
                )}

                <div className="space-y-1">
                  {posts.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between py-3 border-b border-iron group hover:bg-surface/50 px-2 -mx-2"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <span className="text-steel text-[10px] w-20">{p.date}</span>
                        <span className="text-bone text-sm truncate">{p.title}</span>
                        {!p.published && (
                          <span className="text-[9px] text-amber-400 tracking-[0.1em] border border-amber-400/30 px-1.5 py-0.5">
                            DRAFT
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingPost(p);
                            setShowNewPost(false);
                          }}
                          className="text-[10px] text-ash hover:text-bone px-2 py-1"
                        >
                          EDIT
                        </button>
                        <button
                          onClick={() => deletePost(p.id)}
                          className="text-[10px] text-ash hover:text-red-400 px-2 py-1"
                        >
                          DELETE
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {tab === "messages" && (
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <p className="text-iron text-sm tracking-[0.1em] py-12 text-center">
                    NO MESSAGES YET
                  </p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`border p-4 ${m.read ? "border-iron" : "border-ember/30"}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {!m.read && <span className="w-2 h-2 bg-ember" />}
                          <span className="text-bone text-sm">{m.name}</span>
                          <span className="text-ash text-[10px]">&lt;{m.email}&gt;</span>
                        </div>
                        <span className="text-iron text-[10px] tracking-[0.1em]">
                          {new Date(m.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-ash text-xs leading-relaxed">{m.message}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Settings */}
            {tab === "settings" && (
              <motion.div
                className="border-2 border-iron p-6"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <AdminInput
                    label="SITE NAME"
                    value={settings.siteName}
                    onChange={(v) => updateSetting("siteName", v)}
                    placeholder="Kaine"
                  />
                  <AdminInput
                    label="SITE ALIASES (comma separated)"
                    value={settings.siteAliases}
                    onChange={(v) => updateSetting("siteAliases", v)}
                    placeholder="Kaine, Tommy"
                  />
                  <AdminInput
                    label="CONTACT EMAIL"
                    value={settings.contactEmail}
                    onChange={(v) => updateSetting("contactEmail", v)}
                    placeholder="hello@example.com"
                  />
                  <div className="md:col-span-2">
                    <AdminInput
                      label="SITE DESCRIPTION"
                      value={settings.siteDescription}
                      onChange={(v) => updateSetting("siteDescription", v)}
                      placeholder="Search/meta description text..."
                      multiline
                    />
                  </div>
                  <div className="md:col-span-2">
                    <AdminInput
                      label="HERO SUBTITLE"
                      value={settings.heroSubtitle}
                      onChange={(v) => updateSetting("heroSubtitle", v)}
                      placeholder="DEVELOPER - DESIGNER - BUILDER"
                    />
                  </div>
                  <AdminInput
                    label="GITHUB URL"
                    value={settings.socialGithub}
                    onChange={(v) => updateSetting("socialGithub", v)}
                    placeholder="https://github.com/..."
                  />
                  <AdminInput
                    label="TWITTER/X URL"
                    value={settings.socialTwitter}
                    onChange={(v) => updateSetting("socialTwitter", v)}
                    placeholder="https://x.com/..."
                  />
                  <AdminInput
                    label="LINKEDIN URL"
                    value={settings.socialLinkedin}
                    onChange={(v) => updateSetting("socialLinkedin", v)}
                    placeholder="https://linkedin.com/in/..."
                  />
                  <AdminInput
                    label="RESPONSE TIME HOURS"
                    value={settings.responseTimeHours}
                    onChange={(v) => updateSetting("responseTimeHours", v)}
                    placeholder="24"
                  />
                  <AdminInput
                    label="LEGAL EFFECTIVE DATE"
                    value={settings.legalEffectiveDate}
                    onChange={(v) => updateSetting("legalEffectiveDate", v)}
                    placeholder="2026-03-12"
                  />
                  <div className="md:col-span-2">
                    <AdminInput
                      label="PRIVACY POLICY"
                      value={settings.privacyPolicy}
                      onChange={(v) => updateSetting("privacyPolicy", v)}
                      placeholder="Privacy policy content..."
                      multiline
                      rows={8}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <AdminInput
                      label="TERMS OF SERVICE"
                      value={settings.termsOfService}
                      onChange={(v) => updateSetting("termsOfService", v)}
                      placeholder="Terms of service content..."
                      multiline
                      rows={8}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6">
                  <button
                    onClick={saveSettings}
                    disabled={savingSettings}
                    className="text-[10px] tracking-[0.2em] bg-ember text-void px-6 py-2 hover:bg-ember/80 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {savingSettings ? "SAVING..." : "SAVE SETTINGS"}
                  </button>
                  {settingsNotice && (
                    <span className="text-[10px] tracking-[0.15em] text-ash">
                      {settingsNotice}
                    </span>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </section>
  );
}

// Normalizes UI-friendly text inputs into the API shape expected by /api/projects.

interface VisualNoteFormItem {
  title: string;
  caption: string;
  image: string;
  alt: string;
}

const emptyVisualNote = (): VisualNoteFormItem => ({
  title: "",
  caption: "",
  image: "",
  alt: "",
});

function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/[*_~]/g, "")
    .replace(/^-{1,3}\s+/gm, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ProjectForm({
  project,
  onSave,
  onCancel,
}: {
  project: Project | null;
  onSave: (p: Partial<Project>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    id: project?.id || "",
    number: project?.number || "",
    title: project?.title || "",
    description: project?.description || "",
    tags: project?.tags?.join(", ") || "",
    year: project?.year || new Date().getFullYear().toString(),
    url: project?.url || "",
    github: project?.github || "",
    status: project?.status || "LIVE",
    featured: project?.featured ?? false,
    sortOrder: project?.sortOrder ?? 0,
    subtitle: project?.caseStudy?.subtitle || project?.caseStudy?.pitch || "",
    role: project?.caseStudy?.role || "",
    timeline: project?.caseStudy?.timeline || "",
    challenge: project?.caseStudy?.challenge || "",
    concept: project?.caseStudy?.concept || "",
    writeup:
      project?.caseStudy?.writeupMarkdown ||
      project?.caseStudy?.writeup?.join("\n\n") ||
      "",
    highlights: project?.caseStudy?.highlights?.join("\n") || "",
    demoSummary: project?.caseStudy?.demoSummary || "",
    demoUrl: project?.caseStudy?.demoUrl || "",
    repoUrl: project?.caseStudy?.repoUrl || "",
  });
  const [visualNotes, setVisualNotes] = useState<VisualNoteFormItem[]>(
    project?.caseStudy?.gallery?.length
      ? project.caseStudy.gallery.map((item) => ({
          title: item.title || "",
          caption: item.caption || "",
          image: item.image || "",
          alt: item.alt || "",
        }))
      : [],
  );
  const [uploadingVisualNoteIndex, setUploadingVisualNoteIndex] = useState<
    number | null
  >(null);
  const [visualNoteUploadNotice, setVisualNoteUploadNotice] = useState("");

  const updateVisualNote = (
    index: number,
    field: keyof VisualNoteFormItem,
    value: string,
  ) => {
    setVisualNotes((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const uploadVisualNoteImage = async (index: number, file: File) => {
    setVisualNoteUploadNotice("");
    setUploadingVisualNoteIndex(index);

    try {
      const payload = new FormData();
      payload.append("file", file);

      const response = await fetch("/api/uploads/project-image", {
        method: "POST",
        body: payload,
      });

      const data = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !data.url) {
        setVisualNoteUploadNotice(data.error || "Image upload failed.");
        return;
      }

      updateVisualNote(index, "image", data.url);
      setVisualNoteUploadNotice("Image uploaded.");
    } catch {
      setVisualNoteUploadNotice("Network error while uploading image.");
    } finally {
      setUploadingVisualNoteIndex(null);
    }
  };

  const handleSave = () => {
    const writeupMarkdown = form.writeup.trim();
    const writeupParagraphs = writeupMarkdown
      .split(/\n\s*\n/g)
      .map((p) => p.trim())
      .filter(Boolean);
    const highlights = form.highlights
      .split(/\n|,/g)
      .map((h) => h.trim())
      .filter(Boolean);
    const mainDescription =
      markdownToPlainText(writeupParagraphs[0] || writeupMarkdown) ||
      form.subtitle.trim() ||
      form.description.trim() ||
      form.title.trim();

    onSave({
      ...(form.id ? { id: form.id } : {}),
      number: form.number,
      title: form.title,
      description: mainDescription,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      year: form.year,
      url: form.url || undefined,
      github: form.github || undefined,
      status: form.status,
      featured: form.featured,
      sortOrder: form.sortOrder,
      caseStudy: {
        subtitle: form.subtitle || undefined,
        pitch: form.subtitle || undefined,
        role: form.role || undefined,
        timeline: form.timeline || undefined,
        challenge: form.challenge || undefined,
        concept: form.concept || undefined,
        writeupMarkdown: writeupMarkdown || undefined,
        // Backward compatibility for legacy consumers.
        writeup: writeupParagraphs,
        highlights,
        demoSummary: form.demoSummary || undefined,
        demoUrl: form.demoUrl || undefined,
        repoUrl: form.repoUrl || undefined,
        gallery: visualNotes
          .map((item) => ({
            title: item.title.trim(),
            caption: item.caption.trim(),
            image: item.image.trim(),
            alt: item.alt.trim(),
          }))
          .filter((item) => item.image.length > 0),
      },
    });
  };

  return (
    <motion.div
      className="border-2 border-iron p-6 mb-6"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="grid md:grid-cols-2 gap-4">
        <AdminInput label="NUMBER" value={form.number} onChange={(v) => setForm({ ...form, number: v })} placeholder="07" />
        <AdminInput label="TITLE" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="PROJECT NAME" />
        <AdminInput label="TAGS (comma separated)" value={form.tags} onChange={(v) => setForm({ ...form, tags: v })} placeholder="REACT, TYPESCRIPT" />
        <AdminInput label="YEAR" value={form.year} onChange={(v) => setForm({ ...form, year: v })} placeholder="2025" />
        <AdminInput label="URL" value={form.url} onChange={(v) => setForm({ ...form, url: v })} placeholder="https://..." />
        <AdminInput label="GITHUB" value={form.github} onChange={(v) => setForm({ ...form, github: v })} placeholder="https://github.com/..." />
        <div>
          <label className="text-[10px] tracking-[0.2em] text-steel block mb-2">STATUS</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full bg-void border border-iron text-bone text-xs py-2 px-3 outline-none focus:border-ember"
          >
            <option value="LIVE">LIVE</option>
            <option value="IN PROGRESS">IN PROGRESS</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </div>
        <div className="flex items-center gap-3 pt-6">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            className="accent-[#FF0066]"
          />
          <label className="text-[10px] tracking-[0.2em] text-ash">FEATURED</label>
        </div>

        <div className="md:col-span-2 border-t border-iron mt-3 pt-5">
          <span className="text-[10px] tracking-[0.25em] text-ember block mb-4">
            CASE STUDY CONTENT
          </span>
        </div>

        <div className="md:col-span-2">
          <AdminInput
            label="SUBTITLE"
            value={form.subtitle}
            onChange={(v) => setForm({ ...form, subtitle: v })}
            placeholder="One-line framing under the project title..."
            multiline
          />
        </div>

        <div className="md:col-span-2">
          <AdminInput
            label="CHALLENGE"
            value={form.challenge}
            onChange={(v) => setForm({ ...form, challenge: v })}
            placeholder="Optional: what was hard about this project?"
            multiline
          />
        </div>
        <div className="md:col-span-2">
          <AdminInput
            label="CONCEPT"
            value={form.concept}
            onChange={(v) => setForm({ ...form, concept: v })}
            placeholder="Optional: how did you approach the solution?"
            multiline
          />
        </div>
        <div className="md:col-span-2">
          <AdminInput
            label="WRITE-UP MARKDOWN"
            value={form.writeup}
            onChange={(v) => setForm({ ...form, writeup: v })}
            placeholder="# What You Built\n\nUse markdown: headings, lists, links, code, and images..."
            multiline
            rows={12}
          />
        </div>
        <div className="md:col-span-2 border border-iron bg-surface/20 p-4">
          <span className="text-[10px] tracking-[0.2em] text-steel block mb-3">
            WRITE-UP PREVIEW
          </span>
          {form.writeup.trim() ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => (
                  <p className="text-xs md:text-sm text-ash leading-relaxed mb-3 last:mb-0">
                    {children}
                  </p>
                ),
                h1: ({ children }) => (
                  <h3 className="font-display text-xl text-bone tracking-tight mb-3">
                    {children}
                  </h3>
                ),
                h2: ({ children }) => (
                  <h4 className="font-display text-lg text-bone tracking-tight mb-2">
                    {children}
                  </h4>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-5 space-y-1 text-xs md:text-sm text-ash mb-3">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-5 space-y-1 text-xs md:text-sm text-ash mb-3">
                    {children}
                  </ol>
                ),
                code: ({ children }) => (
                  <code className="text-[11px] bg-void border border-iron px-1.5 py-0.5 text-smoke">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="text-[11px] bg-void border border-iron p-3 mb-3 overflow-x-auto text-smoke">
                    {children}
                  </pre>
                ),
                img: ({ src, alt }) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={src ?? ""}
                    alt={alt ?? ""}
                    loading="lazy"
                    className="w-full h-auto border border-iron mb-3"
                  />
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ember underline underline-offset-2"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {form.writeup}
            </ReactMarkdown>
          ) : (
            <p className="text-[10px] tracking-[0.15em] text-iron">
              Add markdown above to preview rendered output.
            </p>
          )}
        </div>

        <div className="md:col-span-2 border-t border-iron mt-3 pt-5">
          <span className="text-[10px] tracking-[0.25em] text-steel block mb-4">
            SNAPSHOT
          </span>
        </div>
        <AdminInput
          label="ROLE"
          value={form.role}
          onChange={(v) => setForm({ ...form, role: v })}
          placeholder="Architecture, frontend, backend..."
        />
        <AdminInput
          label="TIMELINE"
          value={form.timeline}
          onChange={(v) => setForm({ ...form, timeline: v })}
          placeholder="8 weeks"
        />
        <div className="md:col-span-2">
          <AdminInput
            label="HIGHLIGHTS (one per line)"
            value={form.highlights}
            onChange={(v) => setForm({ ...form, highlights: v })}
            placeholder="Key outcomes, architecture wins, etc."
            multiline
            rows={5}
          />
        </div>

        <div className="md:col-span-2 border-t border-iron mt-3 pt-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <span className="text-[10px] tracking-[0.25em] text-steel block">
              VISUAL NOTES
            </span>
            <button
              type="button"
              onClick={() => setVisualNotes((prev) => [...prev, emptyVisualNote()])}
              className="text-[10px] tracking-[0.2em] text-ember border border-ember px-3 py-1 hover:bg-ember hover:text-void transition-colors"
            >
              + ADD NOTE
            </button>
          </div>

          {visualNotes.length === 0 ? (
            <p className="text-[10px] tracking-[0.15em] text-iron border border-iron px-3 py-3">
              No visual notes yet. Add at least one image note to populate the Visual Notes section.
            </p>
          ) : (
            <div className="space-y-4">
              {visualNotes.map((note, index) => (
                <div key={`visual-note-${index}`} className="border border-iron p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] tracking-[0.2em] text-ash">
                      NOTE {String(index + 1).padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setVisualNotes((prev) =>
                          prev.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                      className="text-[10px] tracking-[0.15em] text-ash hover:text-red-400 transition-colors"
                    >
                      REMOVE
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    <AdminInput
                      label="NOTE TITLE"
                      value={note.title}
                      onChange={(value) => updateVisualNote(index, "title", value)}
                      placeholder="SYSTEM FLOW"
                    />
                    <AdminInput
                      label="ALT TEXT"
                      value={note.alt}
                      onChange={(value) => updateVisualNote(index, "alt", value)}
                      placeholder="Short accessible image description..."
                    />
                    <div className="md:col-span-2">
                      <AdminInput
                        label="IMAGE PATH OR URL"
                        value={note.image}
                        onChange={(value) => updateVisualNote(index, "image", value)}
                        placeholder="/projects/uar-system.png"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] tracking-[0.2em] text-steel block mb-2">
                        UPLOAD IMAGE
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              void uploadVisualNoteImage(index, file);
                            }
                            event.currentTarget.value = "";
                          }}
                          className="text-[10px] tracking-[0.15em] text-ash file:mr-3 file:border file:border-iron file:bg-void file:text-smoke file:px-3 file:py-1 file:text-[10px] file:tracking-[0.15em] hover:file:border-ember"
                        />
                        {uploadingVisualNoteIndex === index ? (
                          <span className="text-[10px] tracking-[0.15em] text-steel">
                            UPLOADING...
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <AdminInput
                        label="CAPTION"
                        value={note.caption}
                        onChange={(value) => updateVisualNote(index, "caption", value)}
                        placeholder="Explain what this visual shows..."
                        multiline
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {visualNoteUploadNotice ? (
            <p className="text-[10px] tracking-[0.15em] text-ash mt-3">
              {visualNoteUploadNotice}
            </p>
          ) : null}
        </div>

        <div className="md:col-span-2 border-t border-iron mt-3 pt-5">
          <span className="text-[10px] tracking-[0.25em] text-steel block mb-4">
            DEMO (OPTIONAL)
          </span>
        </div>
        <div className="md:col-span-2">
          <AdminInput
            label="DEMO SUMMARY"
            value={form.demoSummary}
            onChange={(v) => setForm({ ...form, demoSummary: v })}
            placeholder="Optional summary for the demo section..."
            multiline
          />
        </div>
        <AdminInput
          label="DEMO URL"
          value={form.demoUrl}
          onChange={(v) => setForm({ ...form, demoUrl: v })}
          placeholder="https://..."
        />
        <AdminInput
          label="REPO URL"
          value={form.repoUrl}
          onChange={(v) => setForm({ ...form, repoUrl: v })}
          placeholder="https://github.com/..."
        />
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={handleSave} className="text-[10px] tracking-[0.2em] bg-ember text-void px-6 py-2 hover:bg-ember/80 transition-colors">
          SAVE
        </button>
        <button onClick={onCancel} className="text-[10px] tracking-[0.2em] text-ash hover:text-bone px-6 py-2 border border-iron">
          CANCEL
        </button>
      </div>
    </motion.div>
  );
}

// Post editor follows the same pattern: text inputs in UI, normalized payload on save.

function PostForm({
  post,
  onSave,
  onCancel,
}: {
  post: Post | null;
  onSave: (p: Partial<Post>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    id: post?.id || "",
    slug: post?.slug || "",
    title: post?.title || "",
    excerpt: post?.excerpt || "",
    content: post?.content || "",
    date: post?.date || new Date().toISOString().slice(0, 10).replace(/-/g, "."),
    readTime: post?.readTime || "5 MIN",
    tags: post?.tags?.join(", ") || "",
    published: post?.published ?? true,
  });

  const handleSave = () => {
    onSave({
      ...(form.id ? { id: form.id } : {}),
      slug: form.slug,
      title: form.title,
      excerpt: form.excerpt,
      content: form.content || undefined,
      date: form.date,
      readTime: form.readTime,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      published: form.published,
    });
  };

  return (
    <motion.div
      className="border-2 border-iron p-6 mb-6"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="grid md:grid-cols-2 gap-4">
        <AdminInput label="SLUG" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} placeholder="my-post-slug" />
        <AdminInput label="TITLE" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="POST TITLE" />
        <div className="md:col-span-2">
          <AdminInput label="EXCERPT" value={form.excerpt} onChange={(v) => setForm({ ...form, excerpt: v })} placeholder="Brief description..." multiline />
        </div>
        <div className="md:col-span-2">
          <AdminInput label="CONTENT (optional, markdown)" value={form.content} onChange={(v) => setForm({ ...form, content: v })} placeholder="Full post content..." multiline rows={10} />
        </div>
        <AdminInput label="DATE" value={form.date} onChange={(v) => setForm({ ...form, date: v })} placeholder="2025.11.15" />
        <AdminInput label="READ TIME" value={form.readTime} onChange={(v) => setForm({ ...form, readTime: v })} placeholder="5 MIN" />
        <AdminInput label="TAGS (comma separated)" value={form.tags} onChange={(v) => setForm({ ...form, tags: v })} placeholder="DESIGN, OPINION" />
        <div className="flex items-center gap-3 pt-6">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => setForm({ ...form, published: e.target.checked })}
            className="accent-[#FF0066]"
          />
          <label className="text-[10px] tracking-[0.2em] text-ash">PUBLISHED</label>
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={handleSave} className="text-[10px] tracking-[0.2em] bg-ember text-void px-6 py-2 hover:bg-ember/80 transition-colors">
          SAVE
        </button>
        <button onClick={onCancel} className="text-[10px] tracking-[0.2em] text-ash hover:text-bone px-6 py-2 border border-iron">
          CANCEL
        </button>
      </div>
    </motion.div>
  );
}

// Shared text input used by both project and post forms.

function AdminInput({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
}) {
  const cls =
    "w-full bg-void border border-iron focus:border-ember text-bone text-xs py-2 px-3 outline-none transition-colors";
  return (
    <div>
      <label className="text-[10px] tracking-[0.2em] text-steel block mb-2">
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows || 3}
          className={`${cls} resize-none`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cls}
        />
      )}
    </div>
  );
}
