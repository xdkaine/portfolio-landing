import test from "node:test";
import assert from "node:assert/strict";
import {
  analyticsOptedOut,
  clientVisitorContext,
  resetClientVisitor,
  setAnalyticsOptOut,
  visitorCampaign,
} from "./visitorClient";

test("browser identifiers rotate on expiry and opt-out clears local identifiers", (t) => {
  const names = [
    "window",
    "navigator",
    "screen",
    "localStorage",
    "sessionStorage",
  ] as const;
  const originals = names.map((name) =>
    Object.getOwnPropertyDescriptor(globalThis, name),
  );
  const originalNow = Date.now;
  const storage = () => {
    const values = new Map<string, string>();
    return {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };
  };
  const local = storage();
  const session = storage();
  let now = 1_800_000_000_000;
  const mocks = [
    {
      devicePixelRatio: 1,
      location: {
        search:
          "?utm_source=qa&utm_medium=email&utm_campaign=person%40example.com",
      },
      dispatchEvent: () => true,
    },
    { language: "en-US", maxTouchPoints: 0, hardwareConcurrency: 8 },
    { width: 1920, height: 1080 },
    local,
    session,
  ];
  names.forEach((name, index) =>
    Object.defineProperty(globalThis, name, {
      configurable: true,
      value: mocks[index],
    }),
  );
  Date.now = () => now;
  t.after(() => {
    setAnalyticsOptOut(false);
    resetClientVisitor();
    Date.now = originalNow;
    names.forEach((name, index) => {
      const descriptor = originals[index];
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    });
  });
  resetClientVisitor();
  const first = clientVisitorContext();
  const next = clientVisitorContext();
  assert.equal(first.visitorToken, next.visitorToken);
  assert.equal(first.sessionToken, next.sessionToken);
  assert.notEqual(first.eventId, next.eventId);
  now += 31 * 60_000;
  const idle = clientVisitorContext();
  assert.equal(idle.visitorToken, first.visitorToken);
  assert.notEqual(idle.sessionToken, first.sessionToken);
  now += 30 * 86_400_000;
  assert.notEqual(clientVisitorContext().visitorToken, first.visitorToken);
  assert.deepEqual(visitorCampaign(), {
    campaignSource: "qa",
    campaignMedium: "email",
    campaignName: "",
  });
  const beforeOptOut = clientVisitorContext();
  setAnalyticsOptOut(true);
  assert.equal(analyticsOptedOut(), true);
  assert.equal(local.getItem("phao.analytics.visitor.v1"), null);
  assert.equal(session.getItem("phao.analytics.session.v1"), null);
  setAnalyticsOptOut(false);
  assert.equal(analyticsOptedOut(), false);
  assert.notEqual(
    clientVisitorContext().visitorToken,
    beforeOptOut.visitorToken,
  );
  const write = local.setItem;
  local.setItem = () => {
    throw new DOMException("Storage quota reached", "QuotaExceededError");
  };
  t.after(() => {
    local.setItem = write;
  });
  setAnalyticsOptOut(true);
  assert.equal(
    analyticsOptedOut(),
    true,
    "Opt-out survives readable storage that rejects preference writes",
  );
  local.setItem = write;
  setAnalyticsOptOut(false);
  // A successfully persisted choice still follows changes from other tabs.
  local.setItem("phao.analytics.preference", "off");
  assert.equal(analyticsOptedOut(), true);
  local.setItem("phao.analytics.preference", "on");
  assert.equal(analyticsOptedOut(), false);
});
