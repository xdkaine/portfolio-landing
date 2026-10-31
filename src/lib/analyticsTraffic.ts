export type TrafficFilter = "all" | "public" | "qa";
export type TrafficClass = "public" | "qa" | "unclassified";
export function trafficFilter(value: string | null): TrafficFilter {
  return value === "public" || value === "qa" ? value : "all";
}
export function campaignIsQa(context: {
  campaignSource?: string;
  campaignMedium?: string;
  campaignName?: string;
}) {
  return (
    ["qa", "test", "internal"].includes(context.campaignSource?.toLowerCase() ?? "") ||
    ["qa", "test", "internal", "visitor-audit"].includes(context.campaignMedium?.toLowerCase() ?? "") ||
    /^(qa|visitor-audit)([- ]|$)/i.test(context.campaignName ?? "")
  );
}
