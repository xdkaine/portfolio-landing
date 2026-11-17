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
import { AdminMetricsDashboard } from "@/components/AdminMetricsDashboard";
import { AdminPostLibrary } from "@/components/AdminPostLibrary";
import {
  deleteProjectRecord,
  fetchAdminDashboardData,
  saveProjectRecord,
  saveSiteSettings,
  type ContactMsg,
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
import { ProjectEditor } from "@/components/ProjectEditor";
import { AboutEditor } from "@/components/AboutEditor";

type Tab = "metrics" | "projects" | "posts" | "messages" | "settings" | "about";

const TAB_KEYS: Tab[] = ["projects", "posts", "about", "messages", "metrics", "settings"];

const messageDateFormatter = new Intl.DateTimeFormat(undefined);

function isTab(value: string | null): value is Tab {
  return value !== null && TAB_KEYS.includes(value as Tab);
}

export default function AdminDashboardClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMountedRef = useRef(true);
  const tab = useMemo<Tab>(() => {
    const queryTab = searchParams.get("tab");
    return isTab(queryTab) ? queryTab : "projects";
  }, [searchParams]);
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
  const [projectSaveNotice, setProjectSaveNotice] = useState("");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);

  // Shared unmount guard for async callbacks (fetching + save actions).
  useEffect(() => {
    isMountedRef.current = true;
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
    const timeoutId = window.setTimeout(() => {
      void fetchData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchData]);

  const updateTab = useCallback(
    (nextTab: Tab) => {
      if (nextTab === tab) return;
      const params = new URLSearchParams(searchParams.toString());
      if (nextTab === "projects") {
        params.delete("tab");
      } else {
        params.set("tab", nextTab);
      }

      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams, tab],
  );

  const updateSetting = useCallback(
    (name: keyof SiteSettings, value: string) => {
      setSettings((prev) => ({ ...prev, [name]: value }));
    },
    [],
  );

  const handleLogout = async () => {
    await fetch("/v1/api/auth/logout", { method: "POST" });
    router.push("/v1/login");
  };

  // Keep form components simple by centralizing create/update/delete here.
  const saveProject = async (project: EditableProject) => {
    setProjectSaveNotice("");
    const result = await saveProjectRecord(project);
    if (!result.ok) {
      setProjectSaveNotice(result.error || "Failed to save project.");
      throw new Error(result.error || "Failed to save project.");
    }

    setEditingProject(null);
    setShowNewProject(false);
    setProjectSaveNotice("Project saved.");
    await fetchData();
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    if (await deleteProjectRecord(id)) {
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
            fetch(`/v1/api/projects/${id}`, {
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
      { key: "projects", label: "PROJECTS", count: projects.length },
      { key: "posts", label: "BLOG POSTS", count: posts.length },
      { key: "about", label: "ABOUT", count: 1 },
      { key: "messages", label: "MESSAGES", count: unreadMessagesCount },
      { key: "metrics", label: "ANALYTICS", count: linkClicks.length },
      { key: "settings", label: "SETTINGS", count: 1 },
    ],
    [
      linkClicks.length,
      posts.length,
      projects.length,
      unreadMessagesCount,
    ],
  );

  return (
    <section data-admin-ui className="pt-28 pb-16 px-4 md:px-8 lg:px-12 min-h-screen">
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
      <div className="flex flex-wrap gap-2 border-b-2 border-iron mb-8" role="tablist" aria-label="Dashboard sections" onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
        const index = buttons.indexOf(event.target as HTMLButtonElement);
        if (index < 0) return;
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next].focus();
      }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`admin-tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={tab === t.key ? `admin-panel-${t.key}` : undefined}
            tabIndex={tab === t.key ? 0 : -1}
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
                      Use the arrows to reorder projects. Your changes appear on the site immediately.
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
                        setProjectSaveNotice("");
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
                {projectSaveNotice ? (
                  <p
                    className="text-[10px] tracking-[0.16em] text-ash mb-4"
                    role="status"
                    aria-live="polite"
                  >
                    {projectSaveNotice}
                  </p>
                ) : null}

                {(showNewProject || editingProject) && (
                  <ProjectEditor
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
                      className="admin-project-row flex flex-col items-stretch gap-3 sm:flex-row sm:items-center justify-between py-3 border-b border-iron group hover:bg-surface/50 px-2 -mx-2"
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
                              ? "text-status-live border-status-live/30"
                              : p.status === "IN PROGRESS"
                                ? "text-status-progress border-status-progress/30"
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
                            setProjectSaveNotice("");
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
              <AdminPostLibrary posts={posts} onRefresh={fetchData} />
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
            {tab === "about" && <AboutEditor />}
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
