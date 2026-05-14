"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import type { SiteSettings } from "@/lib/siteSettings-schema";

interface MetricProject {
  id: string;
  title: string;
  status: string;
  featured: boolean;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
  caseStudy?: unknown;
}

interface MetricPost {
  id: string;
  title: string;
  date: string;
  readTime: string;
  tags: string[];
  published: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface MetricMessage {
  id: string;
  name: string;
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

interface AdminMetricsDashboardProps {
  projects: MetricProject[];
  posts: MetricPost[];
  messages: MetricMessage[];
  linkClicks: LinkClickMetric[];
  settings: SiteSettings;
}

interface DashboardMetric {
  label: string;
  value: string;
  note: string;
  accentClass: string;
}

interface TrendPoint {
  key: string;
  label: string;
  posts: number;
  messages: number;
}

interface ActivityEvent {
  id: string;
  label: string;
  detail: string;
  timestamp: Date;
  accentClass: string;
}

const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "short" });
const snapshotTimeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});

function parseIsoDate(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseLegacyPostDate(value: string): Date | null {
  if (!value) return null;
  const normalized = value.replace(/\./g, "-");
  const parsed = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseReadMinutes(readTime: string): number {
  const match = readTime.match(/(\d{1,3})/);
  if (!match) return 0;
  const minutes = Number(match[1]);
  return Number.isFinite(minutes) ? minutes : 0;
}

function formatShortDate(date: Date): string {
  return shortDateFormatter.format(date);
}

function formatMonthLabel(date: Date): string {
  return monthFormatter.format(date).toLocaleUpperCase();
}

function getMonthKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

function MetricCard({ metric }: { metric: DashboardMetric }) {
  return (
    <motion.div
      className="border border-iron bg-surface/40 p-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <p className="text-[10px] tracking-[0.2em] text-iron mb-2">{metric.label}</p>
      <p className={`font-display text-3xl ${metric.accentClass}`}>{metric.value}</p>
      <p className="text-[10px] tracking-widest text-steel mt-2">{metric.note}</p>
    </motion.div>
  );
}

export function AdminMetricsDashboard({
  projects,
  posts,
  messages,
  linkClicks,
  settings,
}: AdminMetricsDashboardProps) {
  const snapshotTime = useMemo(() => snapshotTimeFormatter.format(new Date()), []);

  const dashboard = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const liveProjects = projects.filter((p) => p.status === "LIVE").length;
    const inProgressProjects = projects.filter(
      (p) => p.status === "IN PROGRESS" || p.status === "IN_PROGRESS",
    ).length;
    const archivedProjects = projects.filter((p) => p.status === "ARCHIVED").length;
    const featuredProjects = projects.filter((p) => p.featured).length;
    const projectsWithCaseStudy = projects.filter((p) => Boolean(p.caseStudy)).length;

    const publishedPosts = posts.filter((p) => p.published).length;
    const draftPosts = posts.length - publishedPosts;
    const averageReadMinutes =
      posts.length > 0
        ? Math.round(
            posts.reduce((sum, post) => sum + parseReadMinutes(post.readTime), 0) /
              posts.length,
          )
        : 0;

    const unreadMessages = messages.filter((m) => !m.read).length;
    const messagesLast7Days = messages.filter((message) => {
      const date = parseIsoDate(message.createdAt);
      return date ? date >= sevenDaysAgo : false;
    }).length;

    const tagCount = new Map<string, number>();
    for (const tag of projects.flatMap((p) => p.tags ?? [])) {
      const normalizedTag = tag.trim().toUpperCase();
      if (!normalizedTag) continue;
      tagCount.set(normalizedTag, (tagCount.get(normalizedTag) ?? 0) + 1);
    }
    for (const tag of posts.flatMap((p) => p.tags ?? [])) {
      const normalizedTag = tag.trim().toUpperCase();
      if (!normalizedTag) continue;
      tagCount.set(normalizedTag, (tagCount.get(normalizedTag) ?? 0) + 1);
    }
    const topTags = Array.from(tagCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const complianceChecks = [
      {
        label: "PRIVACY POLICY",
        ok: settings.privacyPolicy.trim().length > 40,
      },
      {
        label: "TERMS OF SERVICE",
        ok: settings.termsOfService.trim().length > 40,
      },
      {
        label: "LEGAL EFFECTIVE DATE",
        ok: /^\d{4}-\d{2}-\d{2}$/.test(settings.legalEffectiveDate),
      },
      {
        label: "CONTACT EMAIL",
        ok: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.contactEmail),
      },
      {
        label: "SOCIAL LINKS",
        ok: Boolean(
          settings.socialGithub && settings.socialLinkedin && settings.socialTwitter,
        ),
      },
    ];
    const complianceScore = Math.round(
      (complianceChecks.filter((item) => item.ok).length / complianceChecks.length) * 100,
    );

    const totalLinkClicks = linkClicks.reduce((sum, item) => sum + item.count, 0);
    const topClickedLinks = [...linkClicks]
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const trendMap = new Map<string, TrendPoint>();
    for (let i = 5; i >= 0; i -= 1) {
      const pointDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = getMonthKey(pointDate);
      trendMap.set(key, {
        key,
        label: formatMonthLabel(pointDate),
        posts: 0,
        messages: 0,
      });
    }

    for (const message of messages) {
      const date = parseIsoDate(message.createdAt);
      if (!date) continue;
      const key = getMonthKey(date);
      const point = trendMap.get(key);
      if (point) point.messages += 1;
    }

    for (const post of posts) {
      const date =
        parseIsoDate(post.updatedAt) ??
        parseIsoDate(post.createdAt) ??
        parseLegacyPostDate(post.date);
      if (!date) continue;
      const key = getMonthKey(date);
      const point = trendMap.get(key);
      if (point) point.posts += 1;
    }

    const trend = Array.from(trendMap.values());
    const trendMax = Math.max(
      1,
      ...trend.flatMap((point) => [point.posts, point.messages]),
    );

    const activity: ActivityEvent[] = [];

    for (const message of messages) {
      const timestamp = parseIsoDate(message.createdAt);
      if (!timestamp) continue;
      activity.push({
        id: `message-${message.id}`,
        label: "NEW MESSAGE",
        detail: `${message.name}${message.read ? " (read)" : " (unread)"}`,
        timestamp,
        accentClass: "text-ember",
      });
    }

    for (const post of posts) {
      const timestamp =
        parseIsoDate(post.updatedAt) ??
        parseIsoDate(post.createdAt) ??
        parseLegacyPostDate(post.date);
      if (!timestamp) continue;
      activity.push({
        id: `post-${post.id}`,
        label: post.published ? "PUBLISHED POST" : "DRAFT POST",
        detail: post.title,
        timestamp,
        accentClass: post.published ? "text-emerald-400" : "text-amber-400",
      });
    }

    for (const project of projects) {
      const timestamp =
        parseIsoDate(project.updatedAt) ?? parseIsoDate(project.createdAt);
      if (!timestamp) continue;
      activity.push({
        id: `project-${project.id}`,
        label: "PROJECT UPDATE",
        detail: project.title,
        timestamp,
        accentClass:
          project.status === "LIVE"
            ? "text-emerald-400"
            : project.status === "ARCHIVED"
              ? "text-steel"
              : "text-amber-400",
      });
    }

    const recentActivity = activity
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 8);

    const metricCards: DashboardMetric[] = [
      {
        label: "TOTAL PROJECTS",
        value: String(projects.length).padStart(2, "0"),
        note: `${featuredProjects} featured, ${projectsWithCaseStudy} with case study`,
        accentClass: "text-bone",
      },
      {
        label: "TOTAL POSTS",
        value: String(posts.length).padStart(2, "0"),
        note: `${publishedPosts} published, ${draftPosts} drafts`,
        accentClass: "text-bone",
      },
      {
        label: "UNREAD MESSAGES",
        value: String(unreadMessages).padStart(2, "0"),
        note: `${messagesLast7Days} received in last 7 days`,
        accentClass: unreadMessages > 0 ? "text-ember" : "text-emerald-400",
      },
      {
        label: "AVG READ TIME",
        value: `${averageReadMinutes} MIN`,
        note: "Estimated from all post entries",
        accentClass: "text-bone",
      },
      {
        label: "COMPLIANCE SCORE",
        value: `${complianceScore}%`,
        note: "Privacy, terms, legal date, contact, socials",
        accentClass: complianceScore >= 80 ? "text-emerald-400" : "text-amber-400",
      },
      {
        label: "TOP TAG",
        value: topTags[0]?.[0] ?? "N/A",
        note: `${topTags[0]?.[1] ?? 0} usages across content`,
        accentClass: "text-ember",
      },
      {
        label: "LINK CLICKS",
        value: String(totalLinkClicks).padStart(2, "0"),
        note: `${topClickedLinks.length} tracked destinations`,
        accentClass: "text-emerald-400",
      },
    ];

    const projectStatusBreakdown = [
      { label: "LIVE", count: liveProjects, className: "bg-emerald-400" },
      { label: "IN PROGRESS", count: inProgressProjects, className: "bg-amber-400" },
      { label: "ARCHIVED", count: archivedProjects, className: "bg-steel" },
    ];

    const maxProjectStatusCount = Math.max(
      1,
      ...projectStatusBreakdown.map((item) => item.count),
    );

    return {
      metricCards,
      projectStatusBreakdown,
      maxProjectStatusCount,
      topTags,
      trend,
      trendMax,
      complianceChecks,
      recentActivity,
      messagesLast7Days,
      topClickedLinks,
    };
  }, [linkClicks, messages, posts, projects, settings]);

  return (
    <div className="space-y-8">
      <div className="border-2 border-iron p-6 bg-surface/30">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] tracking-[0.25em] text-steel mb-2">
              SYSTEM METRICS
            </p>
            <h2 className="font-display text-3xl md:text-5xl tracking-tight">
              EVERYTHING DASHBOARD
            </h2>
          </div>
          <p className="text-[10px] tracking-[0.2em] text-iron text-right">
            LIVE SNAPSHOT
            <br />
            <span suppressHydrationWarning>{snapshotTime}</span>
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {dashboard.metricCards.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
        <div className="border border-iron p-5 bg-surface/40">
          <p className="text-[10px] tracking-[0.2em] text-steel mb-4">
            CONTENT TREND (6 MONTHS)
          </p>
          <div className="h-44 flex items-end gap-3">
            {dashboard.trend.map((point) => {
              const messageHeight = Math.max(
                6,
                Math.round((point.messages / dashboard.trendMax) * 100),
              );
              const postHeight = Math.max(
                6,
                Math.round((point.posts / dashboard.trendMax) * 100),
              );

              return (
                <div key={point.key} className="flex-1 min-w-0">
                  <div className="h-32 flex items-end justify-center gap-1">
                    <div
                      className="w-2 bg-ember/80"
                      style={{ height: `${messageHeight}%` }}
                      title={`Messages: ${point.messages}`}
                    />
                    <div
                      className="w-2 bg-steel/80"
                      style={{ height: `${postHeight}%` }}
                      title={`Posts: ${point.posts}`}
                    />
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-[9px] tracking-[0.15em] text-iron">{point.label}</p>
                    <p className="text-[9px] text-ash">
                      {point.messages}/{point.posts}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-[10px] tracking-widest text-iron">
            Left bar = messages, right bar = posts.
          </p>
        </div>

        <div className="border border-iron p-5 bg-surface/40">
          <p className="text-[10px] tracking-[0.2em] text-steel mb-4">
            PROJECT STATUS MIX
          </p>
          <div className="space-y-3">
            {dashboard.projectStatusBreakdown.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-[10px] tracking-[0.15em] mb-1">
                  <span className="text-ash">{item.label}</span>
                  <span className="text-bone">{String(item.count).padStart(2, "0")}</span>
                </div>
                <div className="h-2 bg-void/60 border border-iron">
                  <div
                    className={`h-full ${item.className}`}
                    style={{
                      width: `${Math.round(
                        (item.count / dashboard.maxProjectStatusCount) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-[10px] tracking-[0.2em] text-steel mb-3">TOP TAGS</p>
          <div className="flex flex-wrap gap-2">
            {dashboard.topTags.length > 0 ? (
              dashboard.topTags.map(([tag, count]) => (
                <span
                  key={tag}
                  className="text-[9px] tracking-[0.12em] text-bone border border-iron px-2 py-1"
                >
                  {tag} ({count})
                </span>
              ))
            ) : (
              <span className="text-[10px] tracking-[0.12em] text-iron">
                NO TAG DATA
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
        <div className="border border-iron p-5 bg-surface/40">
          <p className="text-[10px] tracking-[0.2em] text-steel mb-4">
            COMPLIANCE CHECKLIST
          </p>
          <div className="space-y-3">
            {dashboard.complianceChecks.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between border-b border-iron/70 pb-2"
              >
                <span className="text-xs tracking-widest text-ash">{item.label}</span>
                <span
                  className={`text-[10px] tracking-[0.15em] ${
                    item.ok ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {item.ok ? "OK" : "NEEDS ATTENTION"}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[10px] tracking-widest text-iron">
            Messages in last 7 days: {dashboard.messagesLast7Days}
          </p>
        </div>

        <div className="border border-iron p-5 bg-surface/40">
          <p className="text-[10px] tracking-[0.2em] text-steel mb-4">
            RECENT ACTIVITY
          </p>
          <div className="space-y-2 max-h-72 overflow-auto pr-1">
            {dashboard.recentActivity.length > 0 ? (
              dashboard.recentActivity.map((event) => (
                <div
                  key={event.id}
                  className="border border-iron/70 px-3 py-2 bg-void/30"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] tracking-[0.15em] ${event.accentClass}`}>
                      {event.label}
                    </span>
                    <span className="text-[9px] tracking-widest text-iron">
                      {formatShortDate(event.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-ash mt-1 truncate">{event.detail}</p>
                </div>
              ))
            ) : (
              <p className="text-xs tracking-widest text-iron">NO ACTIVITY AVAILABLE</p>
            )}
          </div>
        </div>
      </div>

      <div className="border border-iron p-5 bg-surface/40">
        <p className="text-[10px] tracking-[0.2em] text-steel mb-4">
          TOP CLICKED LINKS
        </p>
        <div className="space-y-2">
          {dashboard.topClickedLinks.length > 0 ? (
            dashboard.topClickedLinks.map((item) => (
              <div
                key={item.key}
                className="border border-iron/70 px-3 py-2 bg-void/30"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] tracking-[0.15em] text-ash uppercase">
                    {item.external ? "EXTERNAL" : "INTERNAL"} LINK
                  </span>
                  <span className="text-[10px] tracking-[0.15em] text-emerald-400">
                    {item.count} CLICKS
                  </span>
                </div>
                <p className="text-xs text-bone mt-1 truncate">{item.destination}</p>
                <p className="text-[10px] text-iron mt-1 truncate">
                  Source: {item.sourcePath} | Label: {item.label}
                </p>
              </div>
            ))
          ) : (
            <p className="text-xs tracking-widest text-iron">
              NO LINK CLICKS TRACKED YET
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
