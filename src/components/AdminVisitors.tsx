"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnalyticsTrafficFilter } from "./AnalyticsTrafficFilter";
import type { TrafficFilter } from "@/lib/analyticsTraffic";
import { Search, Users, RefreshCw, ArrowLeft } from "lucide-react";
import type { VisitorSignals } from "@/lib/visitorIdentity";
type VisitEvent = {
  id: string;
  createdAt: string;
  occurredAt: string;
  clientSequence: number;
  type: string;
  path: string;
  destination: string;
  label: string;
  ip: string | null;
  ipSource: string;
  activeMs: number;
  scrollDepth: number;
  loadMs: number;
};
type VisitSession = {
  id: string;
  startedAt: string;
  lastSeen: string;
  entryPath: string;
  exitPath: string;
  referrer: string;
  traffic: string;
  campaignName: string;
  campaignSource: string;
  campaignMedium: string;
  pageviews: number;
  clicks: number;
  contacts: number;
  activeMs: number;
  maxScrollDepth: number;
  events: VisitEvent[];
};
type Visitor = {
  id: string;
  isQa: boolean;
  firstSeen: string;
  lastSeen: string;
  lastIp: string | null;
  ipSource: string;
  country: string;
  browser: string;
  os: string;
  device: string;
  fingerprint: string;
  _count?: { sessions: number };
  sessions: { exitPath: string }[];
};
type Detail = Omit<Visitor, "sessions"> & {
  sessions: VisitSession[];
  signals: VisitorSignals;
  userAgent: string;
  similar: number;
  ipHistory: { ip: string; ipSource: string; firstSeen: string; lastSeen: string; observations: number }[];
  fingerprintHistory: { fingerprint: string; firstSeen: string; lastSeen: string; observations: number }[];
};
type List = {
  items: Visitor[];
  total: number;
  page: number;
  pages: number;
  retentionDays: number;
};
const when = (date: string) => new Date(date).toLocaleString();
const elapsed = (ms: number) =>
  ms < 60_000
    ? `${Math.round(ms / 1000)} sec`
    : `${Math.round(ms / 60_000)} min`;
export function AdminVisitors() {
  const [query, setQuery] = useState("");
  const [days, setDays] = useState(30);
  const [traffic, setTraffic] = useState<TrafficFilter>("public");
  const [classifying, setClassifying] = useState(false);
  const [live, setLive] = useState(false);
  const [page, setPage] = useState(1);
  const [list, setList] = useState<List>({
    items: [],
    total: 0,
    page: 1,
    pages: 1,
    retentionDays: 30,
  });
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const sequence = useRef(0);
  const detailSequence = useRef(0);
  const load = useCallback(async () => {
    const id = ++sequence.current;
    setLoading(true);
    setNotice("");
    try {
      const response = await fetch(
        `/v1/api/admin/visitors?${new URLSearchParams({ q: query, traffic, days: String(days), live: String(live), page: String(page) })}`,
        { cache: "no-store" },
      );
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? "Session expired. Sign in again."
            : "Visitor activity could not be loaded. Refresh to retry.",
        );
      const payload = (await response.json()) as List;
      if (id === sequence.current) setList(payload);
    } catch (error) {
      if (id === sequence.current)
        setNotice(
          error instanceof Error
            ? error.message
            : "Visitor activity unavailable.",
        );
    } finally {
      if (id === sequence.current) setLoading(false);
    }
  }, [query, days, live, page, traffic]);
  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => {
      clearTimeout(timer);
      sequence.current += 1;
    };
  }, [load]);
  useEffect(
    () => () => {
      detailSequence.current += 1;
    },
    [],
  );
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 15000);
    return () => clearInterval(timer);
  }, [live, load]);
  const open = async (id: string) => {
    const requestId = ++detailSequence.current;
    setNotice("");
    try {
      const response = await fetch(`/v1/api/admin/visitors/${id}`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload.error ?? "Visitor could not be opened.");
      if (requestId === detailSequence.current) setDetail(payload);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Network error.");
    }
  };
  return (
    <div className="cms-visitors">
      <p className="cms-notice">
        Visitor IDs describe a browser, not a verified person. IPs can be shared
        or change. Fingerprints group similar browser configurations and do not
        prove identity.
      </p>
      <div className="cms-toolbar">
        <AnalyticsTrafficFilter value={traffic} onChange={value => { setTraffic(value); setPage(1); setDetail(null); }} />
        <label className="cms-search">
          <Search size={17} aria-hidden="true" />
          <input
            aria-label="Search visitors"
            placeholder="Search visitor ID, IP, fingerprint, browser or country"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <select
          aria-label="Visitor reporting period"
          value={days}
          onChange={(event) => {
            setDays(Number(event.target.value));
            setPage(1);
          }}
        >
          <option value={1}>Last 24 hours</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
        </select>
        <label className="cms-live-filter">
          <input
            type="checkbox"
            checked={live}
            onChange={(event) => {
              setLive(event.target.checked);
              setPage(1);
            }}
          />
          Active in last 5 min
        </label>
        <button
          className="cms-button"
          disabled={loading}
          onClick={() => void load()}
        >
          <RefreshCw size={15} />
          Refresh visitors
        </button>
      </div>
      <div className="cms-row-between cms-muted">
        <span>
          {loading && !list.items.length ? "Loading" : list.total} browser
          profiles · {list.retentionDays}-day detail retention
        </span>
        <span>
          {live
            ? "Refreshes every 15 sec while visible"
            : "Latest activity first"}
        </span>
      </div>
      {notice && (
        <p className="cms-notice" role="alert">
          {notice}
        </p>
      )}
      {detail ? (
        <div className="cms-panel cms-visitor-detail">
          <div className="cms-row-between">
            <button
              className="cms-button"
              onClick={() => {
                detailSequence.current += 1;
                setDetail(null);
              }}
            >
              <ArrowLeft size={15} />
              Back to visitors
            </button>
            <button className="cms-button" onClick={() => void open(detail.id)}>
              <RefreshCw size={15} />
              Refresh profile
            </button>
          </div>
          <div className="cms-panel-heading cms-row-between">
            <div>
              <h2>Browser {detail.id.slice(0, 10)}</h2>
              <p>
                First observed {when(detail.firstSeen)} · Last observed{" "}
                {when(detail.lastSeen)}
              </p>
            </div>
            <span className="cms-status">{detail.isQa ? "QA / internal browser" : "Anonymous browser ID"}</span>
          </div>
          <p className="cms-muted">Campaigns tagged qa, test or internal are classified per session. A browser override also covers its retained visits and future activity; it never classifies another browser sharing an IP or fingerprint.</p>
          <button className="cms-button" disabled={classifying} onClick={async () => {
            setClassifying(true); setNotice("");
            try {
              const response = await fetch(`/v1/api/admin/visitors/${detail.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isQa: !detail.isQa, expectedIsQa: detail.isQa }) });
              if (!response.ok) throw new Error((await response.json()).error ?? "Classification could not be saved.");
              await open(detail.id); await load();
            } catch (error) { setNotice(error instanceof Error ? error.message : "Classification could not be saved."); }
            finally { setClassifying(false); }
          }}>{classifying ? "Saving classification…" : detail.isQa ? "Remove browser QA override" : "Mark browser as QA / internal"}</button>
          <dl className="cms-visitor-facts">
            <Fact label="Latest IP" value={detail.lastIp || "Unavailable"} />
            <Fact
              label="IP provenance"
              value={
                detail.ipSource === "trusted-proxy"
                  ? "Validated address from configured proxy"
                  : "No trusted IP header"
              }
            />
            <Fact
              label="Country"
              value={detail.country || "Unknown — no geo header"}
            />
            <Fact
              label="Browser / OS"
              value={`${detail.browser} / ${detail.os}`}
            />
            <Fact label="Device" value={detail.device} />
            <Fact
              label="Timezone / language"
              value={`${detail.signals.timezone || "Unknown"} / ${detail.signals.language || "Unknown"}`}
            />
            <Fact
              label="Screen / pixel ratio"
              value={`${detail.signals.screen || "Unknown"} / ${detail.signals.pixelRatio || "Unknown"}`}
            />
            <Fact
              label="Device signals"
              value={`${detail.signals.hardwareConcurrency || "Unknown"} logical processors · ${detail.signals.touchPoints} touch points`}
            />
          </dl>
          <details className="cms-agent"><summary>Retained IP history · {detail.ipHistory.length} addresses</summary>
            <p className="cms-muted">Latest 50 addresses, including prior IPs searchable during 30-day retention.</p>
            {detail.ipHistory.map(row => <p key={`${row.ip}:${row.ipSource}`}><code>{row.ip}</code> · {row.ipSource} · {row.observations} observations · {when(row.firstSeen)} → {when(row.lastSeen)}</p>)}
          </details>
          <details className="cms-agent"><summary>Retained fingerprint history · {detail.fingerprintHistory.length} configurations</summary>
            <p className="cms-muted">Latest 50 observed hashes. Browser versions and settings can change a fingerprint; pre-upgrade events have no historical hash.</p>
            {detail.fingerprintHistory.map(row => <p key={row.fingerprint}><code>{row.fingerprint}</code> · {row.observations} observations · {when(row.firstSeen)} → {when(row.lastSeen)} <button className="cms-button" onClick={() => { setTraffic("all"); setQuery(row.fingerprint); setDays(30); setLive(false); setPage(1); setDetail(null); }}>Search this fingerprint</button></p>)}
          </details>
          <div className="cms-fingerprint">
            <strong>Browser fingerprint · v1</strong>
            <code>{detail.fingerprint}</code>
            <p>
              {detail.similar} other retained browser profile(s) match a retained
              fingerprint observation. Profiles remain separate.
            </p>
            <button
              className="cms-button"
              onClick={() => {
                setTraffic("all");
                setQuery(detail.fingerprint);
                setPage(1);
                setLive(false);
                setDays(30);
                setDetail(null);
              }}
            >
              Inspect current fingerprint
            </button>
          </div>
          <details className="cms-agent">
            <summary>Reported user agent</summary>
            <code>{detail.userAgent || "Unavailable"}</code>
          </details>
          <div className="cms-panel-heading">
            <h2>Visit history</h2>
            <p>
              All traffic for this browser · latest 20 retained sessions · latest 60 journey events per
              session. Background engagement is included in session totals.
            </p>
          </div>
          {detail.sessions.map((session) => (
            <section key={session.id} className="cms-visit-session">
              <div className="cms-row-between">
                <h3>Session {session.id.slice(0, 8)}</h3>
                <span className="cms-status">{detail.isQa || session.traffic === "qa" ? "QA / internal" : "Public traffic"}</span>
                <time>{when(session.startedAt)}</time>
              </div>
              <p className="cms-muted">
                {session.pageviews} page views · {session.clicks} clicks ·{" "}
                {session.contacts} contacts · {elapsed(session.activeMs)} in
                visible pages · {session.maxScrollDepth}% max. page coverage
              </p>
              <p className="cms-muted">
                Source: {session.referrer}{" "}
                {session.campaignName || session.campaignSource
                  ? `· Campaign: ${session.campaignName || "unnamed"} / ${session.campaignSource || "unspecified source"} / ${session.campaignMedium || "unspecified medium"}`
                  : ""}
              </p>
              <ol className="cms-journey">
                {session.events.map((event) => (
                  <li key={event.id}>
                    <div>
                      <span className="cms-status">
                        {event.type === "pageview"
                          ? "Page view"
                          : event.type === "contact"
                            ? "Contact submitted"
                            : event.type}
                      </span>
                      <time title={`Received ${when(event.createdAt)} · client sequence ${event.clientSequence || "legacy"}`}>{when(event.occurredAt || event.createdAt)}</time>
                    </div>
                    <strong>{event.path}</strong>
                    {event.destination && <p>→ {event.destination}</p>}
                    <small>
                      {event.ip || "IP unavailable"}
                      {event.loadMs ? ` · ${event.loadMs} ms navigation` : ""}
                      {event.scrollDepth
                        ? ` · ${event.scrollDepth}% page coverage`
                        : ""}
                    </small>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      ) : (
        <div className="cms-panel" aria-busy={loading}>
          <div className="cms-table-scroll">
            <table className="cms-visitors-table">
              <caption className="sr-only">
                Recent browser profiles and observed network context
              </caption>
              <thead>
                <tr>
                  <th scope="col">Browser ID</th>
                  <th scope="col">Latest IP</th>
                  <th scope="col">Device</th>
                  <th scope="col">Last page</th>
                  <th scope="col">Last observed</th>
                  <th scope="col">Sessions</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((visitor) => (
                  <tr key={visitor.id}>
                    <th scope="row">
                      <button
                        onClick={() => void open(visitor.id)}
                        className="cms-visitor-link"
                      >
                        {visitor.id.slice(0, 10)}
                      </button>
                      <small>{visitor.country || "Country unknown"}</small>
                    </th>
                    <td>
                      <code>{visitor.lastIp || "Unavailable"}</code>
                      <small>{visitor.ipSource}</small>
                    </td>
                    <td>
                      {visitor.browser} / {visitor.os}
                      <small>{visitor.device}</small>
                    </td>
                    <td>{visitor.sessions[0]?.exitPath || "—"}</td>
                    <td>
                      <time>{when(visitor.lastSeen)}</time>
                    </td>
                    <td>{visitor._count?.sessions ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && !list.items.length && (
            <div className="cms-empty">
              <Users size={30} aria-hidden="true" />
              <h2>No visitor profiles in this view</h2>
              <p>
                New public visits appear here after this release. Try clearing
                the search or changing the date filter.
              </p>
            </div>
          )}
          <div className="cms-pagination">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span className="cms-muted">
              Page {list.page} of {list.pages}
            </span>
            <button
              disabled={page >= list.pages || loading}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
      <p className="cms-footnote">
        IP context comes from the configured proxy, never a submitted IP field.
        Country is available only when the proxy supplies it; no IP is sent to
        an external lookup service. A browser ID lasts up to 30 days; tab
        sessions expire after 30 minutes without observed activity. Fingerprints
        use browser/device settings and are stored as a keyed hash. No canvas,
        audio, installed-font scans or cross-site identifiers are collected.
      </p>
    </div>
  );
}
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
