import "server-only";
import { pruneVisitorAnalytics } from "./visitorStore";
import { pruneAggregateAnalytics } from "./analyticsStore";

let timer: ReturnType<typeof setInterval> | undefined;

export function startAnalyticsRetention() {
  if (timer) return;
  let running = false;
  // The persistent Node server also cleans up during quiet periods. Request-time
  // pruning handles the first request after downtime; no extra service is needed.
  timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await pruneVisitorAnalytics();
      await pruneAggregateAnalytics();
    } catch {
      console.warn(
        "[analytics] Retention cleanup failed; retrying on the next pass",
      );
    } finally {
      running = false;
    }
  }, 60 * 60_000);
  timer.unref();
}
