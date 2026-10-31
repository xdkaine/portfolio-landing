"use client";
import type { TrafficFilter } from "@/lib/analyticsTraffic";
export function AnalyticsTrafficFilter({ value, onChange }: { value: TrafficFilter; onChange: (value: TrafficFilter) => void }) {
  return <label className="cms-live-filter">Traffic
    <select aria-label="Traffic classification" value={value} onChange={event => onChange(event.target.value as TrafficFilter)}>
      <option value="public">Public traffic</option>
      <option value="qa">QA / internal traffic</option>
      <option value="all">All traffic</option>
    </select>
  </label>;
}
