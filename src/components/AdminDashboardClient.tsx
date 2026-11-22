"use client";
import { AboutEditor } from "./AboutEditor";
import { ProjectStatus } from "./ProjectStatus";
import { ProjectEditor } from "./ProjectEditor";
import { AdminVisitors } from "./AdminVisitors";

import { useCmsConfirm } from "./CmsConfirm";
import { AdminInbox } from "./AdminInbox";
import { AdminActivity } from "./AdminActivity";
import {
  BarChart3,
  Users,
  FolderKanban,
  FileText,
  Inbox,
  Settings2,
  History,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

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
  type EditableProject,
  type LinkClickMetric,
  type Post,
  type Project,
} from "@/lib/adminDashboardData";
import {
  normalizeProjectStatus,
  compareProjectNumbers,
  compareProjectsByDisplayOrder,
  toTimestamp,
} from "@/lib/projectPresentation";
import {
  DEFAULT_SITE_SETTINGS,
  type SiteSettings,
} from "@/lib/siteSettings-schema";

type Tab =
  | "metrics"
  | "visitors"
  | "projects"
  | "posts"
  | "messages"
  | "settings"
  | "activity"
  | "about";

const TAB_KEYS: Tab[] = [
  "metrics",
  "visitors",
  "projects",
  "posts",
  "messages",
  "activity",
  "settings",
  "about",
];

const SECTION_INFO = {
  about: { label: "About", description: "Edit your profile and About page.", icon: FileText },
  visitors: {
    label: "Visitors",
    description:
      "Inspect browser profiles, network context and visit journeys.",
    icon: Users,
  },
  metrics: {
    label: "Analytics",
    description: "Understand your audience and keep your content moving.",
    icon: BarChart3,
  },
  projects: {
    label: "Projects",
    description: "Manage your projects, stories and images.",
    icon: FolderKanban,
  },
  posts: {
    label: "Posts",
    description: "Write, review and publish with confidence.",
    icon: FileText,
  },
  messages: {
    label: "Inbox",
    description: "Turn incoming messages into organized conversations.",
    icon: Inbox,
  },
  activity: {
    label: "Activity",
    description: "A record of changes across your workspace.",
    icon: History,
  },
  settings: {
    label: "Settings",
    description: "Manage site identity, contact details and legal content.",
    icon: Settings2,
  },
};

function isTab(value: string | null): value is Tab {
  return value !== null && TAB_KEYS.includes(value as Tab);
}

export default function AdminDashboardClient() {
  const { confirm: confirmAction, confirmation } = useCmsConfirm();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMountedRef = useRef(true);
  const tab = useMemo<Tab>(() => {
    const queryTab = searchParams.get("tab");
    return isTab(queryTab) ? queryTab : "metrics";
  }, [searchParams]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [linkClicks, setLinkClicks] = useState<LinkClickMetric[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [activeMessagesCount, setActiveMessagesCount] = useState(0);
  const [savingProject, setSavingProject] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState("");
  const [orderingProjects, setOrderingProjects] = useState(false);
  const [projectOrderNotice, setProjectOrderNotice] = useState("");
  const [projectSaveNotice, setProjectSaveNotice] = useState("");
  const settingsDirty = useRef(false);
  const inboxDirty = useRef(false);
  const onInboxDirty = useCallback((dirty: boolean) => {
    inboxDirty.current = dirty;
  }, []);
  const [showProjectTrash, setShowProjectTrash] = useState(false);
  const [projectQuery, setProjectQuery] = useState("");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);

  // Shared unmount guard for async callbacks (fetching + save actions).
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (settingsDirty.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  // Load all dashboard datasets in parallel so tab counts and lists stay in sync.
  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) {
      return;
    }

    setLoadError("");
    try {
      const data = await fetchAdminDashboardData();

      if (!isMountedRef.current) {
        return;
      }

      setProjects(data.projects);
      setPosts(data.posts);
      setUnreadMessagesCount(data.unreadMessages);
      setActiveMessagesCount(data.activeMessages);
      if (!settingsDirty.current) setSettings(data.settings);
      setLinkClicks(data.linkClicks);
      setLoaded(true);
    } catch (e) {
      setLoadError(
        e instanceof Error
          ? e.message
          : "Workspace could not be loaded. Refresh to retry.",
      );
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
    async (nextTab: Tab) => {
      if (nextTab === tab) return;
      if (
        tab === "messages" &&
        inboxDirty.current &&
        !(await confirmAction({
          title: "Leave without saving the note?",
          description:
            "Save your internal note to preserve these changes, or discard it before leaving the inbox.",
          confirmLabel: "Discard note",
        }))
      )
        return;
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
    [pathname, router, searchParams, tab, confirmAction],
  );

  const updateSetting = useCallback(
    (name: keyof SiteSettings, value: string) => {
      settingsDirty.current = true;
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
    if (savingProject) return;
    setSavingProject(true);
    setProjectSaveNotice("");
    try {
      const result = await saveProjectRecord(project);
      if (!result.ok) {
        throw new Error(result.error || "Failed to save project.");
      }
      setEditingProject(null);
      setShowNewProject(false);
      setProjectSaveNotice("Project saved.");
      await fetchData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save the project. Your edits remain in the form.";
      setProjectSaveNotice(message);
      throw new Error(message);
    } finally {
      setSavingProject(false);
    }
  };

  const deleteProject = async (id: string) => {
    if (
      !(await confirmAction({
        title: "Move project to Trash?",
        description:
          "Its story and media references are preserved for restoration.",
        confirmLabel: "Move to Trash",
      }))
    )
      return;
    const project = projects.find((item) => item.id === id);
    if (!project) return;
    try {
      if (!(await deleteProjectRecord(id, project.version)))
        throw new Error(
          "Project changed or could not be moved. Refresh and retry.",
        );
      await fetchData();
    } catch (error) {
      setProjectSaveNotice(
        error instanceof Error ? error.message : "Network error. Try again.",
      );
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
      settingsDirty.current = false;
      setSettingsNotice("Settings saved.");
    } catch {
      setSettingsNotice("Network error while saving settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const orderedProjects = useMemo(
    () =>
      projects
        .filter((project) => !project.deletedAt)
        .sort(compareProjectsByDisplayOrder),
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

      try {
        const response = await fetch("/v1/api/admin/projects/order", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            records: nextProjects.map(({ id, version }) => ({ id, version })),
          }),
        });
        if (!response.ok) {
          const payload = await response.json();
          throw new Error(payload.error ?? "Project order could not be saved.");
        }
        setProjectOrderNotice(successNotice);
        await fetchData();
      } catch (error) {
        setProjectOrderNotice(
          error instanceof Error
            ? error.message
            : "Failed to update project order.",
        );
      } finally {
        setOrderingProjects(false);
      }
    },
    [fetchData],
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

  const tabs: { key: Tab; count?: number }[] = [
    { key: "metrics" },
    { key: "visitors" },
    {
      key: "projects",
      count: projects.filter((project) => !project.deletedAt).length,
    },
    { key: "posts", count: posts.filter((post) => !post.deletedAt).length },
    { key: "about" },
    { key: "messages", count: unreadMessagesCount },
    { key: "activity" },
    { key: "settings" },
  ];
  const info = SECTION_INFO[tab];
  return (
    <section data-admin-ui className="cms-shell">
      {confirmation}
      <aside className="cms-sidebar">
        <a href="/v1" className="cms-brand">
          {settings.siteName}
          <span>CONTENT WORKSPACE</span>
        </a>
        <p className="cms-eyebrow">MANAGE</p>
        <nav aria-label="CMS sections">
          {tabs.map((item) => {
            const Icon = SECTION_INFO[item.key].icon;
            return (
              <button
                key={item.key}
                data-cms-section
                type="button"
                aria-current={tab === item.key ? "page" : undefined}
                onClick={() => updateTab(item.key)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{SECTION_INFO[item.key].label}</span>
                {item.count !== undefined && <small>{item.count}</small>}
              </button>
            );
          })}
        </nav>
        <div className="cms-sidebar-footer">
          <span className="cms-status">
            {activeMessagesCount} active conversations
          </span>
          <a href="/v1" target="_blank" rel="noreferrer">
            View website
            <ExternalLink size={15} />
          </a>
          <button type="button" onClick={() => void handleLogout()}>
            Sign out
          </button>
        </div>
      </aside>
      <div className="cms-main">
        <header className="cms-header">
          <div>
            <p className="cms-eyebrow">
              WORKSPACE / {info.label.toUpperCase()}
            </p>
            <h1>{info.label}</h1>
            <p>{info.description}</p>
          </div>
          <button
            type="button"
            className="cms-button"
            onClick={() =>
              void (async () => {
                if (
                  !settingsDirty.current ||
                  (await confirmAction({
                    title: "Discard unsaved settings?",
                    description:
                      "Refreshing reloads the last saved site settings.",
                    confirmLabel: "Discard and refresh",
                  }))
                ) {
                  settingsDirty.current = false;
                  await fetchData();
                }
              })()
            }
          >
            <RefreshCw size={15} />
            Refresh workspace
          </button>
          <button
            className="cms-button cms-mobile-signout"
            onClick={() => void handleLogout()}
          >
            Sign out
          </button>
        </header>
        {loadError && (
          <div className="cms-notice" role="alert">
            {loadError} <a href="/v1/login">Sign in</a>
          </div>
        )}
        {loading || !loaded ? (
          <div className="text-center py-12">
            <span className="text-steel text-[10px] tracking-[0.3em]">
              {loadError
                ? "Use Refresh workspace to retry."
                : "Loading workspace…"}
            </span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              id={`admin-panel-${tab}`}
            >
              {/* Metrics */}
              {tab === "metrics" && (
                <AdminMetricsDashboard
                  projects={projects}
                  posts={posts}
                  linkClicks={linkClicks}
                  unread={unreadMessagesCount}
                />
              )}

              {tab === "visitors" && <AdminVisitors />}
              {tab === "about" && <AboutEditor />}

              {/* Projects */}
              {tab === "projects" && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <span className="text-ash text-xs tracking-widest">
                        {orderedProjects.length} projects
                      </span>
                      <p className="text-sm leading-relaxed text-ash mt-2">
                        Manual order is live. Lower display order appears first
                        on the public site.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => void applyProjectOrderPreset("number")}
                        disabled={
                          orderingProjects || orderedProjects.length < 2
                        }
                        className="text-[10px] tracking-[0.18em] text-ash border border-iron px-3 py-2 hover:text-bone hover:border-ash transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ORDER BY #
                      </button>
                      <button
                        type="button"
                        onClick={() => void applyProjectOrderPreset("newest")}
                        disabled={
                          orderingProjects || orderedProjects.length < 2
                        }
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
                    <p
                      className="text-[10px] tracking-[0.16em] text-ash mb-4"
                      aria-live="polite"
                    >
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

                  <div className="cms-toolbar">
                    <input
                      aria-label="Search projects"
                      placeholder="Search projects"
                      value={projectQuery}
                      onChange={(event) => setProjectQuery(event.target.value)}
                    />
                    <button
                      className="cms-button"
                      onClick={() => setShowProjectTrash(!showProjectTrash)}
                    >
                      {showProjectTrash
                        ? "Back to active projects"
                        : "View project Trash"}
                    </button>
                  </div>
                  <div className="space-y-1">
                    {(showProjectTrash
                      ? projects.filter((project) => project.deletedAt)
                      : orderedProjects
                    )
                      .filter(
                        (project) =>
                          !projectQuery ||
                          [project.title, project.number, ...project.tags]
                            .join(" ")
                            .toLowerCase()
                            .includes(projectQuery.toLowerCase()),
                      )
                      .map((p, index) => (
                        <div
                          key={p.id}
                          className="cms-project-row flex flex-wrap gap-3 items-center justify-between py-3 border-b border-iron group hover:bg-surface/50 px-2 -mx-2"
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <span className="text-iron text-[10px] w-14">
                              ORD {String(index + 1).padStart(2, "0")}
                            </span>
                            <span className="text-iron text-[10px] w-6">
                              {p.number}
                            </span>
                            <span className="text-bone text-sm truncate">
                              {p.title}
                            </span>
                            <ProjectStatus status={normalizeProjectStatus(p.status)} />
                            {p.featured && (
                              <span className="text-[9px] text-ember tracking-widest">
                                FEATURED
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {showProjectTrash ? (
                              <button
                                className="cms-button"
                                onClick={() =>
                                  void (async () => {
                                    try {
                                      const response = await fetch(
                                        `/v1/api/admin/projects/${p.id}/restore`,
                                        {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({
                                            version: p.version,
                                          }),
                                        },
                                      );
                                      if (!response.ok)
                                        throw new Error(
                                          "Project could not be restored. Refresh and retry.",
                                        );
                                      await fetchData();
                                    } catch (error) {
                                      setProjectSaveNotice(
                                        error instanceof Error
                                          ? error.message
                                          : "Restore failed.",
                                      );
                                    }
                                  })()
                                }
                              >
                                Restore project
                              </button>
                            ) : (
                              <>
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
                                    orderingProjects ||
                                    index === orderedProjects.length - 1
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
                                  TRASH
                                </button>
                              </>
                            )}
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

              {tab === "messages" && (
                <AdminInbox
                  onChanged={fetchData}
                  onDirtyChange={onInboxDirty}
                />
              )}
              {tab === "activity" && <AdminActivity />}

              {/* Settings */}
              {tab === "settings" && (
                <motion.div
                  inert={savingSettings}
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
                      <span
                        className="text-[10px] tracking-[0.15em] text-ash"
                        aria-live="polite"
                      >
                        {settingsNotice}
                      </span>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
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
  inputMode?:
    | "none"
    | "text"
    | "tel"
    | "url"
    | "email"
    | "numeric"
    | "decimal"
    | "search";
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
      <label
        htmlFor={fieldId}
        className="text-[10px] tracking-[0.2em] text-steel block mb-2"
      >
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
