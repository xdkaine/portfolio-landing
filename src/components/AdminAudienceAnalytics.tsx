"use client";
import Link from "next/link";
import type { visitorReport } from "@/lib/visitorStore";
export type AudienceReport = Awaited<ReturnType<typeof visitorReport>>;
export function AdminAudienceAnalytics({
  audience,
}: {
  audience: AudienceReport;
}) {
  return (
    <section className="cms-audience">
      <div className="cms-panel-heading cms-row-between">
        <div>
          <h2>Visitors and engagement</h2>
          <p>
            Detailed coverage from {new Date(audience.from).toLocaleString()} ·{" "}
            {audience.retentionDays}-day retention
          </p>
        </div>
        <Link className="cms-button" href={`/v1/admin?tab=visitors&traffic=${audience.traffic}`}>
          Inspect visitors →
        </Link>
      </div>
      {audience.samplingLimitReached && (
        <p className="cms-notice" role="status">
          The daily limit of {audience.dailyDetailLimit.toLocaleString()}{" "}
          detailed events was reached in this period. Aggregate counts continue;
          visitor details may be incomplete.
        </p>
      )}
      <div className="cms-audience-stats">
        <Summary label="New browser profiles" value={audience.newVisitors.toLocaleString()} note="First observed within this reporting window" />
        <Summary label="Returning browser profiles" value={audience.returningVisitors.toLocaleString()} note={`${audience.returningSessions} sessions followed an earlier retained session`} />
        <Summary label="Visitors on multiple days" value={audience.repeatDayVisitors.toLocaleString()} note="Observed on at least two UTC dates in this window" />
        <Summary label="Returning sessions" value={audience.returningSessions.toLocaleString()} note="New and returning profiles may overlap within the 30-day detail limit" />
      </div>
      <div className="cms-audience-stats">
        <Summary
          label="Browser profiles"
          value={audience.visitors.toLocaleString()}
          note="First-party IDs; people may use several browsers"
        />
        <Summary
          label="Sessions"
          value={audience.sessions.toLocaleString()}
          note="Per tab; 30-minute inactivity window"
        />
        <Summary
          label="Active in last 5 min"
          value={audience.live.toLocaleString()}
          note="Recent observations, not a live presence guarantee"
        />
        <Summary
          label="Avg. visible-page time"
          value={`${Math.round(audience.averageActiveMs / 1000)} sec`}
          note="Window activity per observed session"
        />
      </div>
      <div className="cms-audience-stats">
        <Summary
          label="Engagement rate"
          value={`${audience.engagementRate}%`}
          note="10 seconds visible, multiple pages, or contact"
        />
        <Summary
          label="Contact conversion"
          value={`${audience.sessions ? Math.round((audience.contactSessions / audience.sessions) * 1000) / 10 : 0}%`}
          note={`${audience.contactSessions} retained sessions submitted a contact form`}
        />
        <Summary
          label="Avg. navigation time"
          value={
            audience.loadSamples ? `${audience.averageLoadMs} ms` : "No samples"
          }
          note={`${audience.loadSamples} full-navigation samples; not a Core Web Vitals score`}
        />
        <Summary
          label="90% page coverage"
          value={audience.deepReadSessions.toLocaleString()}
          note="Sessions that covered at least 90% of a page"
        />
      </div>
      <div className="cms-two-columns">
        <Rank
          title="Countries"
          note="Proxy-supplied country; unavailable locations stay unknown"
          items={audience.countries}
        />
        <Rank
          title="Browsers"
          note="Reported browser family"
          items={audience.browsers}
        />
        <Rank
          title="Operating systems"
          note="Reported operating system family"
          items={audience.systems}
        />
        <Rank
          title="Campaigns"
          note="Campaign / source / medium; explicitly tagged visits only"
          items={audience.campaigns}
        />
        <Rank
          title="Landing pages"
          note="First pageview inside this reporting window"
          items={audience.landingPages}
        />
        <Rank
          title="Exit pages"
          note="Last pageview inside this window; delayed clicks do not change it"
          items={audience.exitPages}
        />
      </div>
      <div className="cms-panel">
        <div className="cms-panel-heading">
          <h2>Navigation performance by page</h2>
          <p>
            Time from navigation start to DOMContentLoaded · full document loads
            only
          </p>
        </div>
        {audience.performancePages.length ? (
          <div className="cms-table-scroll">
            <table className="cms-visitors-table">
              <thead>
                <tr>
                  <th scope="col">Page</th>
                  <th scope="col">Average</th>
                  <th scope="col">Samples</th>
                </tr>
              </thead>
              <tbody>
                {audience.performancePages.map((item) => (
                  <tr key={item.path}>
                    <th scope="row">{item.path}</th>
                    <td>{item.milliseconds} ms</td>
                    <td>{item.samples}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="cms-empty-small">
            Navigation measurements appear after new public visits.
          </p>
        )}
      </div>
    </section>
  );
}
function Summary({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="cms-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
function Rank({
  title,
  note,
  items,
}: {
  title: string;
  note: string;
  items: { label: string; count: number }[];
}) {
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <div className="cms-panel">
      <div className="cms-panel-heading">
        <h2>{title}</h2>
        <p>{note}</p>
      </div>
      {items.length ? (
        <ol className="cms-ranking">
          {items.map((item) => (
            <li key={item.label}>
              <div style={{ width: `${(item.count / max) * 100}%` }} />
              <span>{item.label}</span>
              <strong>{item.count}</strong>
            </li>
          ))}
        </ol>
      ) : (
        <p className="cms-empty-small">No observations in this period.</p>
      )}
    </div>
  );
}
