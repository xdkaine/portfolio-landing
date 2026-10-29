import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAnalyticsEvent,
  analyticsWindow,
  summarizeAnalytics,
} from "./analytics";

test("tracking strips query strings, fragments and credentials before aggregation", () => {
  assert.deepEqual(
    normalizeAnalyticsEvent({
      type: "pageview",
      path: "/v1/blog?email=private#body",
      referrer: "https://user:secret@search.example/query?q=private",
      device: "mobile",
    }),
    {
      type: "pageview",
      path: "/v1/blog",
      destination: "",
      label: "",
      referrer: "search.example",
      device: "mobile",
    },
  );
  assert.equal(
    normalizeAnalyticsEvent({
      type: "click",
      path: "/v1",
      destination: "mailto:private@example.com?subject=secret",
    })?.destination,
    "mailto:",
  );
});

test("private routes and malformed or unbounded dimensions are excluded", () => {
  for (const path of [
    "/v1/admin",
    "/v1/admin/posts/1",
    "/v1/api/contact",
    "/v1/login",
    "//evil.test/v1",
    "/other",
    "/v1/%61dmin",
    "/v1/blog/../admin",
  ]) {
    assert.equal(
      normalizeAnalyticsEvent({ type: "pageview", path }),
      null,
      path,
    );
  }
  assert.equal(
    normalizeAnalyticsEvent({
      type: "click",
      path: "/v1",
      destination: "javascript:alert(1)",
    }),
    null,
  );
  assert.equal(
    normalizeAnalyticsEvent({
      type: "pageview",
      path: "/v1",
      device: "fingerprint",
    })?.device,
    "other",
  );
});

test("UTC reporting includes today and an equal non-overlapping comparison window", () => {
  const window = analyticsWindow(7, new Date("2026-10-28T23:59:59Z"));
  assert.equal(window.start.toISOString(), "2026-10-22T00:00:00.000Z");
  assert.equal(window.previousStart.toISOString(), "2026-10-15T00:00:00.000Z");
  assert.equal(window.end.toISOString(), "2026-10-29T00:00:00.000Z");
});

test("reports fill empty days and keep page views distinct from clicks and submissions", () => {
  const report = summarizeAnalytics(
    [
      {
        day: new Date("2026-10-28"),
        type: "pageview",
        path: "/v1",
        destination: "",
        label: "",
        referrer: "Direct",
        device: "desktop",
        count: 6,
      },
      {
        day: new Date("2026-10-28"),
        type: "click",
        path: "/v1",
        destination: "https://example.com/",
        label: "Demo",
        referrer: "",
        device: "other",
        count: 2,
      },
      {
        day: new Date("2026-10-21"),
        type: "pageview",
        path: "/v1",
        destination: "",
        label: "",
        referrer: "Direct",
        device: "desktop",
        count: 3,
      },
    ],
    7,
    new Date("2026-10-28T12:00:00Z"),
  );
  assert.equal(report.totals.pageviews, 6);
  assert.equal(report.previous.pageviews, 3);
  assert.equal(report.trend.length, 7);
  assert.equal(report.trend[0].pageviews, 0);
  assert.equal(report.pages[0].count, 6);
  assert.equal(report.totals.clicks, 2);
});
