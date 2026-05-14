"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AdminMetricsDashboard } from "@/components/AdminMetricsDashboard";
import {
  deletePostRecord,
  deleteProjectRecord,
  fetchAdminDashboardData,
  savePostRecord,
  saveProjectRecord,
  saveSiteSettings,
  type ContactMsg,
  type EditablePost,
  type EditableProject,
  type LinkClickMetric,
  type Post,
  type Project,
} from "@/lib/adminDashboardData";
import {
  compareProjectNumbers,
  compareProjectsByDisplayOrder,
  toTimestamp,
} from "@/lib/projectPresentation";
import {
  DEFAULT_SITE_SETTINGS,
  type SiteSettings,
} from "@/lib/siteSettings-schema";

type Tab = "metrics" | "projects" | "posts" | "messages" | "settings";

const TAB_KEYS: Tab[] = ["metrics", "projects", "posts", "messages", "settings"];

const messageDateFormatter = new Intl.DateTimeFormat(undefined);

function isTab(value: string | null): value is Tab {
  return value !== null && TAB_KEYS.includes(value as Tab);
}

export default function AdminDashboardClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMountedRef = useRef(true);
  const [tab, setTab] = useState<Tab>(() => {
    const queryTab = searchParams.get("tab");
    return isTab(queryTab) ? queryTab : "metrics";
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [messages, setMessages] = useState<ContactMsg[]>([]);
  const [linkClicks, setLinkClicks] = useState<LinkClickMetric[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState("");
  const [orderingProjects, setOrderingProjects] = useState(false);
  const [projectOrderNotice, setProjectOrderNotice] = useState("");
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
      const data = await fetchAdminDashboardData();

      if (!isMountedRef.current) {
        return;
      }

      setProjects(data.projects);
      setPosts(data.posts);
      setMessages(data.messages);
      setSettings(data.settings);
      setLinkClicks(data.linkClicks);
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

  useEffect(() => {
    const queryTab = searchParams.get("tab");
    setTab(isTab(queryTab) ? queryTab : "metrics");
  }, [searchParams]);

  const updateTab = useCallback(
    (nextTab: Tab) => {
      setTab(nextTab);

      const params = new URLSearchParams(searchParams.toString());
      if (nextTab === "metrics") {
        params.delete("tab");
      } else {
        params.set("tab", nextTab);
      }

      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

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
  const saveProject = async (project: EditableProject) => {
    if (await saveProjectRecord(project)) {
      setEditingProject(null);
      setShowNewProject(false);
      await fetchData();
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    if (await deleteProjectRecord(id)) {
      await fetchData();
    }
  };

  const savePost = async (post: EditablePost) => {
    if (await savePostRecord(post)) {
      setEditingPost(null);
      setShowNewPost(false);
      await fetchData();
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    if (await deletePostRecord(id)) {
      await fetchData();
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    setSettingsNotice("");

    try {
      const result = await saveSiteSettings(settings);

      if (!result.ok) {
        setSettingsNotice(result.error || "Failed to update settings.");
        return;
      }

      if (result.settings) {
        setSettings(result.settings);
      }
      setSettingsNotice("Settings saved.");
    } catch {
      setSettingsNotice("Network error while saving settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const orderedProjects = useMemo(
    () => [...projects].sort(compareProjectsByDisplayOrder),
    [projects],
  );

  const nextProjectSortOrder = useMemo(() => {
    if (orderedProjects.length === 0) {
      return 0;
    }

    return (
      orderedProjects.reduce(
        (highestOrder, project) => Math.max(highestOrder, project.sortOrder),
        -1,
      ) + 1
    );
  }, [orderedProjects]);

  const persistProjectOrder = useCallback(
    async (nextProjects: Project[], successNotice: string) => {
      setOrderingProjects(true);
      setProjectOrderNotice("");

      const currentSortOrders = new Map(
        projects.map((project) => [project.id, project.sortOrder]),
      );

      try {
        const updates = nextProjects
          .map((project, index) => ({
            id: project.id,
            sortOrder: index,
          }))
          .filter(
            (project) => currentSortOrders.get(project.id) !== project.sortOrder,
          );

        if (updates.length === 0) {
          setProjectOrderNotice(successNotice);
          return;
        }

        const responses = await Promise.all(
          updates.map(({ id, sortOrder }) =>
            fetch(`/api/projects/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sortOrder }),
            }),
          ),
        );

        if (responses.some((response) => !response.ok)) {
          setProjectOrderNotice("Failed to update project order.");
          return;
        }

        setProjectOrderNotice(successNotice);
        await fetchData();
      } catch {
        setProjectOrderNotice("Failed to update project order.");
      } finally {
        setOrderingProjects(false);
      }
    },
    [fetchData, projects],
  );

  const moveProject = useCallback(
    async (projectId: string, direction: -1 | 1) => {
      const currentIndex = orderedProjects.findIndex(
        (project) => project.id === projectId,
      );
      const nextIndex = currentIndex + direction;

      if (
        currentIndex < 0 ||
        nextIndex < 0 ||
        nextIndex >= orderedProjects.length
      ) {
        return;
      }

      const nextProjects = [...orderedProjects];
      const [movedProject] = nextProjects.splice(currentIndex, 1);
      nextProjects.splice(nextIndex, 0, movedProject);

      await persistProjectOrder(nextProjects, "Project order updated.");
    },
    [orderedProjects, persistProjectOrder],
  );

  const applyProjectOrderPreset = useCallback(
    async (mode: "number" | "newest") => {
      const nextProjects = [...orderedProjects].sort((left, right) => {
        if (mode === "number") {
          return compareProjectNumbers(left.number, right.number);
        }

        const createdAtDifference =
          toTimestamp(right.createdAt) - toTimestamp(left.createdAt);
        if (createdAtDifference !== 0) {
          return createdAtDifference;
        }

        return compareProjectNumbers(left.number, right.number);
      });

      const successNotice =
        mode === "number"
          ? "Project order synced to project numbers."
          : "Project order updated to newest first.";

      await persistProjectOrder(nextProjects, successNotice);
    },
    [orderedProjects, persistProjectOrder],
  );

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
          type="button"
          onClick={handleLogout}
          className="text-[10px] tracking-[0.2em] text-ash hover:text-ember border border-iron hover:border-ember px-4 py-2 transition-colors"
        >
          LOGOUT
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b-2 border-iron mb-8" role="tablist" aria-label="Dashboard sections">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`admin-tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={`admin-panel-${t.key}`}
            onClick={() => updateTab(t.key)}
            className={`text-[10px] tracking-[0.2em] px-4 py-3 border-b-2 -mb-0.5 transition-colors ${
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
          <span className="text-steel text-[10px] tracking-[0.3em]">LOADING…</span>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            role="tabpanel"
            id={`admin-panel-${tab}`}
            aria-labelledby={`admin-tab-${tab}`}
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
                  <div>
                    <span className="text-ash text-xs tracking-widest">
                      {orderedProjects.length} projects
                    </span>
                    <p className="text-[10px] tracking-[0.18em] text-iron mt-2">
                      Manual order is live. Lower display order appears first on the
                      public site.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => void applyProjectOrderPreset("number")}
                      disabled={orderingProjects || orderedProjects.length < 2}
                      className="text-[10px] tracking-[0.18em] text-ash border border-iron px-3 py-2 hover:text-bone hover:border-ash transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ORDER BY #
                    </button>
                    <button
                      type="button"
                      onClick={() => void applyProjectOrderPreset("newest")}
                      disabled={orderingProjects || orderedProjects.length < 2}
                      className="text-[10px] tracking-[0.18em] text-ash border border-iron px-3 py-2 hover:text-bone hover:border-ash transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      NEWEST FIRST
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewProject(true);
                        setEditingProject(null);
                      }}
                      className="text-[10px] tracking-[0.2em] text-ember border border-ember px-4 py-2 hover:bg-ember hover:text-void transition-colors"
                    >
                      + NEW PROJECT
                    </button>
                  </div>
                </div>
                {projectOrderNotice ? (
                  <p className="text-[10px] tracking-[0.16em] text-ash mb-4" aria-live="polite">
                    {projectOrderNotice}
                  </p>
                ) : null}

                {(showNewProject || editingProject) && (
                  <ProjectForm
                    key={editingProject?.id ?? "new-project"}
                    project={editingProject}
                    onSave={saveProject}
                    defaultSortOrder={nextProjectSortOrder}
                    onCancel={() => {
                      setEditingProject(null);
                      setShowNewProject(false);
                    }}
                  />
                )}

                <div className="space-y-1">
                  {orderedProjects.map((p, index) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between py-3 border-b border-iron group hover:bg-surface/50 px-2 -mx-2"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <span className="text-iron text-[10px] w-14">
                          ORD {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="text-iron text-[10px] w-6">{p.number}</span>
                        <span className="text-bone text-sm truncate">{p.title}</span>
                        <span
                          className={`text-[9px] tracking-widest px-1.5 py-0.5 border ${
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
                          <span className="text-[9px] text-ember tracking-widest">FEATURED</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void moveProject(p.id, -1)}
                          disabled={orderingProjects || index === 0}
                          className="text-[10px] text-ash hover:text-bone px-2 py-1 border border-iron disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          UP
                        </button>
                        <button
                          type="button"
                          onClick={() => void moveProject(p.id, 1)}
                          disabled={
                            orderingProjects || index === orderedProjects.length - 1
                          }
                          className="text-[10px] text-ash hover:text-bone px-2 py-1 border border-iron disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          DOWN
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProject(p);
                            setShowNewProject(false);
                          }}
                          className="text-[10px] text-ash hover:text-bone px-2 py-1"
                        >
                          EDIT
                        </button>
                        <button
                          type="button"
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
                  <span className="text-ash text-xs tracking-widest">
                    {posts.length} posts
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewPost(true);
                      setEditingPost(null);
                    }}
                    className="text-[10px] tracking-[0.2em] text-ember border border-ember px-4 py-2 hover:bg-ember hover:text-void transition-colors"
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
                          <span className="text-[9px] text-amber-400 tracking-widest border border-amber-400/30 px-1.5 py-0.5">
                            DRAFT
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPost(p);
                            setShowNewPost(false);
                          }}
                          className="text-[10px] text-ash hover:text-bone px-2 py-1"
                        >
                          EDIT
                        </button>
                        <button
                          type="button"
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
                  <p className="text-iron text-sm tracking-widest py-12 text-center">
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
                        <span className="text-iron text-[10px] tracking-widest">
                          {messageDateFormatter.format(new Date(m.createdAt))}
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
                  <AdminTextInput
                    label="SITE NAME"
                    value={settings.siteName}
                    onChange={(v) => updateSetting("siteName", v)}
                    placeholder="Kaine"
                  />
                  <AdminTextInput
                    label="SITE ALIASES (comma separated)"
                    value={settings.siteAliases}
                    onChange={(v) => updateSetting("siteAliases", v)}
                    placeholder="Kaine, Tommy"
                  />
                  <AdminTextInput
                    label="CONTACT EMAIL"
                    value={settings.contactEmail}
                    onChange={(v) => updateSetting("contactEmail", v)}
                    placeholder="hello@example.com"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    spellCheck={false}
                  />
                  <div className="md:col-span-2">
                    <AdminTextarea
                      label="SITE DESCRIPTION"
                      value={settings.siteDescription}
                      onChange={(v) => updateSetting("siteDescription", v)}
                      placeholder="Search/meta description text…"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <AdminTextInput
                      label="HERO SUBTITLE"
                      value={settings.heroSubtitle}
                      onChange={(v) => updateSetting("heroSubtitle", v)}
                      placeholder="DEVELOPER - DESIGNER - BUILDER"
                    />
                  </div>
                  <AdminTextInput
                    label="GITHUB URL"
                    value={settings.socialGithub}
                    onChange={(v) => updateSetting("socialGithub", v)}
                    placeholder="https://github.com/…"
                    type="url"
                    autoComplete="url"
                    inputMode="url"
                  />
                  <AdminTextInput
                    label="TWITTER/X URL"
                    value={settings.socialTwitter}
                    onChange={(v) => updateSetting("socialTwitter", v)}
                    placeholder="https://x.com/…"
                    type="url"
                    autoComplete="url"
                    inputMode="url"
                  />
                  <AdminTextInput
                    label="LINKEDIN URL"
                    value={settings.socialLinkedin}
                    onChange={(v) => updateSetting("socialLinkedin", v)}
                    placeholder="https://linkedin.com/in/…"
                    type="url"
                    autoComplete="url"
                    inputMode="url"
                  />
                  <AdminTextInput
                    label="RESPONSE TIME HOURS"
                    value={settings.responseTimeHours}
                    onChange={(v) => updateSetting("responseTimeHours", v)}
                    placeholder="24"
                    inputMode="numeric"
                  />
                  <AdminTextInput
                    label="FOOTER CHUCKLES GIF URL"
                    value={settings.footerChucklesGifUrl}
                    onChange={(v) => updateSetting("footerChucklesGifUrl", v)}
                    placeholder="https://…"
                    type="url"
                    autoComplete="url"
                    inputMode="url"
                  />
                  <AdminTextInput
                    label="LEGAL EFFECTIVE DATE"
                    value={settings.legalEffectiveDate}
                    onChange={(v) => updateSetting("legalEffectiveDate", v)}
                    placeholder="2026-03-12"
                  />
                  <div className="md:col-span-2">
                    <AdminTextarea
                      label="PRIVACY POLICY"
                      value={settings.privacyPolicy}
                      onChange={(v) => updateSetting("privacyPolicy", v)}
                      placeholder="Privacy policy content…"
                      rows={8}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <AdminTextarea
                      label="TERMS OF SERVICE"
                      value={settings.termsOfService}
                      onChange={(v) => updateSetting("termsOfService", v)}
                      placeholder="Terms of service content…"
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
                    {savingSettings ? "SAVING…" : "SAVE SETTINGS"}
                  </button>
                  {settingsNotice && (
                    <span className="text-[10px] tracking-[0.15em] text-ash" aria-live="polite">
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
  defaultSortOrder,
  onSave,
  onCancel,
}: {
  project: Project | null;
  defaultSortOrder: number;
  onSave: (p: EditableProject) => void;
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
    sortOrder: project?.sortOrder ?? defaultSortOrder,
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
  const [bulkUploading, setBulkUploading] = useState(false);

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

  const bulkUploadImages = async (files: FileList) => {
    if (files.length === 0) return;
    if (files.length > 5) {
      setVisualNoteUploadNotice("You can upload a maximum of 5 images at a time.");
      return;
    }

    setVisualNoteUploadNotice("");
    setBulkUploading(true);

    try {
      const payload = new FormData();
      for (const file of Array.from(files)) {
        payload.append("files", file);
      }

      const response = await fetch("/api/uploads/project-image", {
        method: "POST",
        body: payload,
      });

      const data = (await response.json().catch(() => ({}))) as {
        urls?: string[];
        url?: string;
        error?: string;
      };

      if (!response.ok) {
        setVisualNoteUploadNotice(data.error || "Bulk upload failed.");
        return;
      }

      const urls = data.urls ?? (data.url ? [data.url] : []);
      if (urls.length === 0) {
        setVisualNoteUploadNotice("Upload returned no image URLs.");
        return;
      }

      // Create a new visual note stub for each uploaded image.
      const newNotes: VisualNoteFormItem[] = urls.map((url) => ({
        title: "",
        caption: "",
        image: url,
        alt: "",
      }));

      setVisualNotes((prev) => [...prev, ...newNotes]);
      setVisualNoteUploadNotice(`${urls.length} image${urls.length > 1 ? "s" : ""} uploaded. Add titles and captions below.`);
    } catch {
      setVisualNoteUploadNotice("Network error during bulk upload.");
    } finally {
      setBulkUploading(false);
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
        <AdminTextInput label="NUMBER" value={form.number} onChange={(v) => setForm({ ...form, number: v })} placeholder="07" inputMode="numeric" />
        <AdminTextInput label="TITLE" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="PROJECT NAME" />
        <AdminTextInput label="TAGS (comma separated)" value={form.tags} onChange={(v) => setForm({ ...form, tags: v })} placeholder="REACT, TYPESCRIPT" />
        <AdminTextInput label="YEAR" value={form.year} onChange={(v) => setForm({ ...form, year: v })} placeholder="2025" inputMode="numeric" />
        <div>
          <label htmlFor="project-sort-order" className="text-[10px] tracking-[0.2em] text-steel block mb-2">
            DISPLAY ORDER
          </label>
          <input
            id="project-sort-order"
            name="project-sort-order"
            type="number"
            min={0}
            step={1}
            autoComplete="off"
            inputMode="numeric"
            value={form.sortOrder}
            onChange={(event) =>
              setForm({
                ...form,
                sortOrder: Math.max(
                  0,
                  Number.isFinite(event.currentTarget.valueAsNumber)
                    ? event.currentTarget.valueAsNumber
                    : 0,
                ),
              })
            }
            className="w-full bg-void border border-iron text-bone text-xs py-2 px-3 focus-visible:border-ember focus-visible:ring-2 focus-visible:ring-ember/40"
          />
          <p className="text-[10px] tracking-[0.15em] text-iron mt-2">
            Lower numbers display first.
          </p>
        </div>
        <AdminTextInput label="URL" value={form.url} onChange={(v) => setForm({ ...form, url: v })} placeholder="https://…" type="url" inputMode="url" autoComplete="url" />
        <AdminTextInput label="GITHUB" value={form.github} onChange={(v) => setForm({ ...form, github: v })} placeholder="https://github.com/…" type="url" inputMode="url" autoComplete="url" />
        <div>
          <label htmlFor="project-status" className="text-[10px] tracking-[0.2em] text-steel block mb-2">STATUS</label>
          <select
            id="project-status"
            name="project-status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="w-full bg-void border border-iron text-bone text-xs py-2 px-3 focus-visible:border-ember focus-visible:ring-2 focus-visible:ring-ember/40"
          >
            <option value="LIVE">LIVE</option>
            <option value="IN PROGRESS">IN PROGRESS</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </div>
        <label className="flex items-center gap-3 pt-6 cursor-pointer">
          <input
            type="checkbox"
            name="featured"
            checked={form.featured}
            onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            className="accent-ember"
          />
          <span className="text-[10px] tracking-[0.2em] text-ash">FEATURED</span>
        </label>

        <div className="md:col-span-2 border-t border-iron mt-3 pt-5">
          <span className="text-[10px] tracking-[0.25em] text-ember block mb-4">
            CASE STUDY CONTENT
          </span>
        </div>

        <div className="md:col-span-2">
          <AdminTextarea
            label="SUBTITLE"
            value={form.subtitle}
            onChange={(v) => setForm({ ...form, subtitle: v })}
            placeholder="One-line framing under the project title…"
          />
        </div>

        <div className="md:col-span-2">
          <AdminTextarea
            label="CHALLENGE"
            value={form.challenge}
            onChange={(v) => setForm({ ...form, challenge: v })}
            placeholder="Optional: what was hard about this project?"
          />
        </div>
        <div className="md:col-span-2">
          <AdminTextarea
            label="CONCEPT"
            value={form.concept}
            onChange={(v) => setForm({ ...form, concept: v })}
            placeholder="Optional: how did you approach the solution?"
          />
        </div>
        <div className="md:col-span-2">
          <AdminTextarea
            label="WRITE-UP MARKDOWN"
            value={form.writeup}
            onChange={(v) => setForm({ ...form, writeup: v })}
            placeholder="# What You Built\n\nUse markdown: headings, lists, links, code, and images…"
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
                    width={1600}
                    height={1000}
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
        <AdminTextInput
          label="ROLE"
          value={form.role}
          onChange={(v) => setForm({ ...form, role: v })}
          placeholder="Architecture, frontend, backend…"
        />
        <AdminTextInput
          label="TIMELINE"
          value={form.timeline}
          onChange={(v) => setForm({ ...form, timeline: v })}
          placeholder="8 weeks"
        />
        <div className="md:col-span-2">
          <AdminTextarea
            label="HIGHLIGHTS (one per line)"
            value={form.highlights}
            onChange={(v) => setForm({ ...form, highlights: v })}
            placeholder="Key outcomes, architecture wins, etc."
            rows={5}
          />
        </div>

        <div className="md:col-span-2 border-t border-iron mt-3 pt-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <span className="text-[10px] tracking-[0.25em] text-steel block">
              VISUAL NOTES
            </span>
            <div className="flex items-center gap-2">
              <label className="text-[10px] tracking-[0.2em] text-ember border border-ember px-3 py-1 hover:bg-ember hover:text-void transition-colors cursor-pointer">
                {bulkUploading ? "UPLOADING…" : "+ BULK UPLOAD"}
                <input
                  name="bulk-visual-notes"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  multiple
                  className="hidden"
                  disabled={bulkUploading}
                  onChange={(event) => {
                    const fileList = event.target.files;
                    if (fileList && fileList.length > 0) {
                      void bulkUploadImages(fileList);
                    }
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => setVisualNotes((prev) => [...prev, emptyVisualNote()])}
                className="text-[10px] tracking-[0.2em] text-ember border border-ember px-3 py-1 hover:bg-ember hover:text-void transition-colors"
              >
                + ADD NOTE
              </button>
            </div>
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
                    <AdminTextInput
                      label="NOTE TITLE"
                      value={note.title}
                      onChange={(value) => updateVisualNote(index, "title", value)}
                      placeholder="SYSTEM FLOW"
                    />
                    <AdminTextInput
                      label="ALT TEXT"
                      value={note.alt}
                      onChange={(value) => updateVisualNote(index, "alt", value)}
                      placeholder="Short accessible image description…"
                    />
                    <div className="md:col-span-2">
                      <AdminTextInput
                        label="IMAGE PATH OR URL"
                        value={note.image}
                        onChange={(value) => updateVisualNote(index, "image", value)}
                        placeholder="/projects/uar-system.png"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor={`visual-note-upload-${index}`} className="text-[10px] tracking-[0.2em] text-steel block mb-2">
                        UPLOAD IMAGE
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          id={`visual-note-upload-${index}`}
                          name={`visual-note-upload-${index}`}
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
                            UPLOADING…
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <AdminTextarea
                        label="CAPTION"
                        value={note.caption}
                        onChange={(value) => updateVisualNote(index, "caption", value)}
                        placeholder="Explain what this visual shows…"
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
          <AdminTextarea
            label="DEMO SUMMARY"
            value={form.demoSummary}
            onChange={(v) => setForm({ ...form, demoSummary: v })}
            placeholder="Optional summary for the demo section…"
          />
        </div>
        <AdminTextInput
          label="DEMO URL"
          value={form.demoUrl}
          onChange={(v) => setForm({ ...form, demoUrl: v })}
          placeholder="https://…"
          type="url"
          inputMode="url"
          autoComplete="url"
        />
        <AdminTextInput
          label="REPO URL"
          value={form.repoUrl}
          onChange={(v) => setForm({ ...form, repoUrl: v })}
          placeholder="https://github.com/…"
          type="url"
          inputMode="url"
          autoComplete="url"
        />
      </div>
      <div className="flex gap-3 mt-6">
        <button type="button" onClick={handleSave} className="text-[10px] tracking-[0.2em] bg-ember text-void px-6 py-2 hover:bg-ember/80 transition-colors">
          SAVE
        </button>
        <button type="button" onClick={onCancel} className="text-[10px] tracking-[0.2em] text-ash hover:text-bone px-6 py-2 border border-iron">
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
  onSave: (p: EditablePost) => void;
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
        <AdminTextInput label="SLUG" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} placeholder="my-post-slug" />
        <AdminTextInput label="TITLE" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="POST TITLE" />
        <div className="md:col-span-2">
          <AdminTextarea label="EXCERPT" value={form.excerpt} onChange={(v) => setForm({ ...form, excerpt: v })} placeholder="Brief description…" />
        </div>
        <div className="md:col-span-2">
          <AdminTextarea label="CONTENT (optional, markdown)" value={form.content} onChange={(v) => setForm({ ...form, content: v })} placeholder="Full post content…" rows={10} />
        </div>
        <AdminTextInput label="DATE" value={form.date} onChange={(v) => setForm({ ...form, date: v })} placeholder="2025.11.15" inputMode="numeric" />
        <AdminTextInput label="READ TIME" value={form.readTime} onChange={(v) => setForm({ ...form, readTime: v })} placeholder="5 MIN" />
        <AdminTextInput label="TAGS (comma separated)" value={form.tags} onChange={(v) => setForm({ ...form, tags: v })} placeholder="DESIGN, OPINION" />
        <label className="flex items-center gap-3 pt-6 cursor-pointer">
          <input
            type="checkbox"
            name="published"
            checked={form.published}
            onChange={(e) => setForm({ ...form, published: e.target.checked })}
            className="accent-ember"
          />
          <span className="text-[10px] tracking-[0.2em] text-ash">PUBLISHED</span>
        </label>
      </div>
      <div className="flex gap-3 mt-6">
        <button type="button" onClick={handleSave} className="text-[10px] tracking-[0.2em] bg-ember text-void px-6 py-2 hover:bg-ember/80 transition-colors">
          SAVE
        </button>
        <button type="button" onClick={onCancel} className="text-[10px] tracking-[0.2em] text-ash hover:text-bone px-6 py-2 border border-iron">
          CANCEL
        </button>
      </div>
    </motion.div>
  );
}

type AdminFieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  name?: string;
  autoComplete?: string;
};

type AdminTextInputProps = AdminFieldProps & {
  type?: "text" | "email" | "url" | "number";
  inputMode?: "none" | "text" | "tel" | "url" | "email" | "numeric" | "decimal" | "search";
  spellCheck?: boolean;
};

type AdminTextareaProps = AdminFieldProps & {
  rows?: number;
};

const adminControlClassName =
  "w-full bg-void border border-iron focus-visible:border-ember focus-visible:ring-2 focus-visible:ring-ember/40 text-bone text-xs py-2 px-3 transition-colors";

function toFieldName(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "admin-field"
  );
}

function AdminField({
  label,
  fieldId,
  children,
}: {
  label: string;
  fieldId: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={fieldId} className="text-[10px] tracking-[0.2em] text-steel block mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

function AdminTextInput({
  label,
  value,
  onChange,
  placeholder,
  name,
  autoComplete = "off",
  type = "text",
  inputMode,
  spellCheck,
}: AdminTextInputProps) {
  const fieldId = useId();

  return (
    <AdminField label={label} fieldId={fieldId}>
      <input
        id={fieldId}
        name={name ?? toFieldName(label)}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        spellCheck={spellCheck}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={adminControlClassName}
      />
    </AdminField>
  );
}

function AdminTextarea({
  label,
  value,
  onChange,
  placeholder,
  name,
  autoComplete = "off",
  rows = 3,
}: AdminTextareaProps) {
  const fieldId = useId();

  return (
    <AdminField label={label} fieldId={fieldId}>
      <textarea
        id={fieldId}
        name={name ?? toFieldName(label)}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`${adminControlClassName} resize-none`}
      />
    </AdminField>
  );
}
