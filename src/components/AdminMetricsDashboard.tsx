"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Download,
  MousePointer2,
  Eye,
  Mail,
  RefreshCw,
} from "lucide-react";
import type { AnalyticsReport } from "@/lib/analytics";
import type { Project, Post, LinkClickMetric } from "@/lib/adminDashboardData";
function change(current: number, previous: number) {
  return previous
    ? `${current >= previous ? "+" : ""}${Math.round(((current - previous) / previous) * 100)}%`
    : current
      ? "New activity"
      : "No change";
}
function exportReport(report: AnalyticsReport) {
  const rows = [
    ["UTC date", "Page views", "Link clicks", "Contact submissions"],
    ...report.trend.map((point) => [
      point.day,
      point.pageviews,
      point.clicks,
      point.contacts,
    ]),
  ];
  const blob = new Blob([rows.map((row) => row.join(",")).join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `phao-analytics-${report.start.slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
export function AdminMetricsDashboard({
  projects,
  posts,
  linkClicks,
  unread,
}: {
  projects: Project[];
  posts: Post[];
  linkClicks: LinkClickMetric[];
  unread: number;
}) {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const load = useCallback(async () => {
    const id = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/v1/api/admin/analytics?days=${days}`, {
        cache: "no-store",
      });
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? "Session expired. Sign in again."
            : "Analytics unavailable. Refresh to retry.",
        );
      const payload = (await response.json()) as AnalyticsReport;
      if (id === generation.current) setReport(payload);
    } catch (error) {
      if (id === generation.current)
        setError(
          error instanceof Error ? error.message : "Analytics unavailable.",
        );
    } finally {
      if (id === generation.current) setLoading(false);
    }
  }, [days]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => {
      clearTimeout(timer);
      generation.current += 1;
    };
  }, [load]);
  const live = posts.filter(
    (post) => !post.deletedAt && post.status === "PUBLISHED",
  ).length;
  const drafts = posts.filter(
    (post) =>
      !post.deletedAt &&
      (post.status === "DRAFT" || post.hasUnpublishedChanges),
  ).length;
  const maximum = Math.max(
    1,
    ...(report?.trend.map((point) => point.pageviews) ?? []),
  );
  return (
    <div className="cms-analytics">
      <div className="cms-toolbar cms-row-between">
        <div className="cms-range" aria-label="Reporting period">
          {[7, 30, 90].map((value) => (
            <button
              key={value}
              aria-pressed={days === value}
              onClick={() => setDays(value)}
            >
              {value} days
            </button>
          ))}
        </div>
        <div className="cms-toolbar">
          <button
            className="cms-button"
            disabled={loading}
            onClick={() => void load()}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
          <button
            className="cms-button"
            disabled={!report || loading || !!error}
            onClick={() => report && exportReport(report)}
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>
      </div>
      {error && (
        <p className="cms-notice" role="alert">
          {error}
        </p>
      )}
      <p className="cms-muted">
        {report
          ? `${report.start.slice(0, 10)} – ${new Date(new Date(report.end).getTime() - 1).toISOString().slice(0, 10)} · UTC · refreshed ${new Date(report.generatedAt).toLocaleTimeString()}`
          : "Loading traffic report…"}
      </p>
      <div className="cms-stat-grid" aria-busy={loading}>
        {[
          {
            label: "Page views",
            value: report?.totals.pageviews,
            before: report?.previous.pageviews,
            icon: Eye,
            note: "Recorded page loads",
          },
          {
            label: "Link clicks",
            value: report?.totals.clicks,
            before: report?.previous.clicks,
            icon: MousePointer2,
            note: "Public site interactions",
          },
          {
            label: "Contact submissions",
            value: report?.totals.contacts,
            before: report?.previous.contacts,
            icon: Mail,
            note: "Accepted contact forms",
          },
        ].map(({ label, value, before, icon: Icon, note }) => (
          <div className="cms-stat" key={label}>
            <div className="cms-row-between">
              <span>{label}</span>
              <Icon size={18} aria-hidden="true" />
            </div>
            <strong>{value?.toLocaleString() ?? "—"}</strong>
            <p>
              <span>
                {value !== undefined ? change(value, before ?? 0) : "Loading"}
              </span>{" "}
              vs previous {days} days
            </p>
            <small>{note}</small>
          </div>
        ))}
      </div>
      <div className="cms-panel">
        <div className="cms-panel-heading cms-row-between">
          <div>
            <h2>Audience activity</h2>
            <p>Daily page views · UTC</p>
          </div>
          <span className="cms-chart-key">
            <i />
            Page views
          </span>
        </div>
        {report && report.totals.pageviews === 0 ? (
          <div className="cms-empty">
            <Eye aria-hidden="true" />
            <h3>Your traffic story starts here</h3>
            <p>
              Page views appear as visitors browse after this release.
              Historical clicks remain below.
            </p>
          </div>
        ) : (
          <div className="cms-chart" aria-label="Daily page views">
            <div className="cms-chart-bars">
              {report?.trend.map((point) => (
                <div
                  key={point.day}
                  title={`${point.day}: ${point.pageviews} page views`}
                >
                  <span
                    style={{
                      height: `${Math.max(point.pageviews ? 2 : 0, (point.pageviews / maximum) * 100)}%`,
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="cms-chart-labels">
              <span>{report?.trend[0]?.day}</span>
              <span>{report?.trend.at(-1)?.day}</span>
            </div>
          </div>
        )}
        <details className="cms-data-table">
          <summary>View daily data</summary>
          <div className="cms-table-scroll">
            <table>
              <caption className="sr-only">Daily traffic counts in UTC</caption>
              <thead>
                <tr>
                  <th scope="col">UTC date</th>
                  <th scope="col">Views</th>
                  <th scope="col">Clicks</th>
                  <th scope="col">Contacts</th>
                </tr>
              </thead>
              <tbody>
                {report?.trend.map((point) => (
                  <tr key={point.day}>
                    <th scope="row">{point.day}</th>
                    <td>{point.pageviews}</td>
                    <td>{point.clicks}</td>
                    <td>{point.contacts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
      <div className="cms-two-columns">
        <Ranked
          title="Top pages"
          description="Where visitors spend their page loads"
          items={report?.pages ?? []}
        />
        <Ranked
          title="Top destinations"
          description="Links clicked during this period"
          items={report?.links ?? []}
        />
        <Ranked
          title="Traffic sources"
          description="Referrer hostnames; Direct includes unknown sources"
          items={report?.referrers ?? []}
        />
        <Ranked
          title="Devices"
          description="Broad browser device categories"
          items={report?.devices ?? []}
        />
      </div>
      <div className="cms-panel cms-workspace-summary">
        <div className="cms-panel-heading">
          <h2>Workspace at a glance</h2>
          <p>Current content and inbox status</p>
        </div>
        <div>
          <a href="/v1/admin?tab=posts">
            <strong>{live}</strong>Published posts
            <ArrowUpRight size={16} />
          </a>
          <a href="/v1/admin?tab=posts">
            <strong>{drafts}</strong>Drafts & pending edits
            <ArrowUpRight size={16} />
          </a>
          <a href="/v1/admin?tab=messages">
            <strong>{unread}</strong>Unread messages
            <ArrowUpRight size={16} />
          </a>
          <a href="/v1/admin?tab=projects">
            <strong>
              {projects.filter((project) => !project.deletedAt).length}
            </strong>
            Projects
            <ArrowUpRight size={16} />
          </a>
        </div>
      </div>
      <details className="cms-panel cms-legacy">
        <summary>
          Historical click totals ·{" "}
          {linkClicks
            .reduce((sum, item) => sum + item.count, 0)
            .toLocaleString()}{" "}
          clicks
        </summary>
        <p className="cms-muted">
          Lifetime counters captured before this release. They cannot be
          assigned to daily periods and are kept separate from the new traffic
          report.
        </p>
        <Ranked
          title="Historical destinations"
          items={linkClicks
            .slice(0, 10)
            .map((item) => ({ label: item.destination, count: item.count }))}
        />
      </details>
      <p className="cms-footnote">
        Traffic is aggregated without visitor cookies, stored IP addresses or
        visitor IDs. Queries and URL fragments are removed. DNT/GPC and common
        bots are excluded from browser activity. Counts are directional and may
        include automated traffic; unique visitors are not measured. Daily data
        is retained for 180 days and pruned on the next accepted event.
      </p>
    </div>
  );
}
function Ranked({
  title,
  description,
  items,
}: {
  title: string;
  description?: string;
  items: { label: string; count: number }[];
}) {
  const maximum = Math.max(1, ...items.map((item) => item.count));
  return (
    <div className="cms-panel">
      <div className="cms-panel-heading">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {items.length ? (
        <ol className="cms-ranking">
          {items.slice(0, 8).map((item) => (
            <li key={item.label}>
              <div style={{ width: `${(item.count / maximum) * 100}%` }} />
              <span title={item.label}>{item.label}</span>
              <strong>{item.count.toLocaleString()}</strong>
            </li>
          ))}
        </ol>
      ) : (
        <p className="cms-empty-small">No activity in this period.</p>
      )}
    </div>
  );
}
