"use client";
import { useSyncExternalStore } from "react";
import { analyticsOptedOut, setAnalyticsOptOut } from "@/lib/visitorClient";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("phao-analytics-preference", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("phao-analytics-preference", callback);
  };
}
export function AnalyticsPreferences() {
  const disabled = useSyncExternalStore(
    subscribe,
    analyticsOptedOut,
    () => false,
  );
  return (
    <div className="border border-iron p-5 mt-8" id="analytics-preferences">
      <h2 className="text-bone text-base mb-4">
        Visitor analytics preferences
      </h2>
      <label className="flex gap-3 items-start text-sm">
        <input
          type="checkbox"
          checked={disabled}
          className="mt-1 accent-ember"
          onChange={(event) => setAnalyticsOptOut(event.target.checked)}
        />
        Stop visitor analytics on this browser
      </label>
      <p className="text-sm text-steel mt-3">
        This site also respects Do Not Track and Global Privacy Control. This
        preference stops new events; existing detailed records expire after 30
        days.
      </p>
    </div>
  );
}
