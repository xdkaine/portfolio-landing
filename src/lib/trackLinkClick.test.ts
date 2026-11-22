import test from "node:test";
import assert from "node:assert/strict";
import { sendAnalytics } from "./trackLinkClick";

test("tracking falls back only when the beacon is refused and honors browser privacy signals", (t) => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator",
  );
  const originalFetch = globalThis.fetch;
  t.after(() => {
    if (originalWindow)
      Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (originalNavigator)
      Object.defineProperty(globalThis, "navigator", originalNavigator);
    else Reflect.deleteProperty(globalThis, "navigator");
    globalThis.fetch = originalFetch;
  });
  let accepted = false;
  let beacons = 0;
  let requests = 0;
  const browser = {
    doNotTrack: "0",
    globalPrivacyControl: false,
    sendBeacon: () => {
      beacons += 1;
      return accepted;
    },
  };
  Object.defineProperty(globalThis, "window", {
    value: {},
    configurable: true,
  });
  Object.defineProperty(globalThis, "navigator", {
    value: browser,
    configurable: true,
  });
  globalThis.fetch = async () => {
    requests += 1;
    return new Response(null, { status: 204 });
  };
  sendAnalytics("/v1/api/analytics/events", { type: "pageview", path: "/v1" });
  assert.equal(requests, 1);
  accepted = true;
  sendAnalytics("/v1/api/analytics/events", {});
  assert.equal(requests, 1);
  assert.equal(beacons, 2);
  browser.doNotTrack = "1";
  sendAnalytics("/v1/api/analytics/events", {});
  browser.doNotTrack = "0";
  browser.globalPrivacyControl = true;
  sendAnalytics("/v1/api/analytics/events", {});
  assert.equal(beacons, 2);
  assert.equal(requests, 1);
});
