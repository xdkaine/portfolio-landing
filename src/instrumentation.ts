import { assertProductionRuntimeConfiguration } from "../runtime-config.mjs";

export async function register() {
  assertProductionRuntimeConfiguration();
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startAnalyticsRetention } = await import(
      "./lib/analyticsRetention"
    );
    startAnalyticsRetention();
  }
}
