import test from "node:test";
import assert from "node:assert/strict";
import {
  browserFamily,
  visitorNetwork,
  normalizeVisitorContext,
  visitorKeys,
  normalizeCampaign,
} from "./visitorIdentity";
const token = "12345678-1234-4321-8321-123456789012";
const input = {
  visitorToken: token,
  sessionToken: token,
  eventId: token,
  signals: {
    language: "en-US",
    timezone: "America/Los_Angeles",
    screen: "1920x1080",
    pixelRatio: 1,
    touchPoints: 0,
    hardwareConcurrency: 8,
  },
};
test("visitor IP provenance accepts only a single validated address from a trusted proxy", () => {
  const headers = new Headers({
    "x-real-ip": "198.51.100.7",
    "x-forwarded-for": "192.0.2.99",
    "cf-ipcountry": "US",
  });
  assert.equal(visitorNetwork(headers, false).ip, null);
  assert.deepEqual(visitorNetwork(headers, true), {
    ip: "198.51.100.7",
    ipSource: "trusted-proxy",
    country: "US",
  });
  for (const value of [
    "bad",
    "198.51.100.7, 192.0.2.1",
    "192.0.2.1:123",
    "999.0.0.1",
  ])
    assert.equal(
      visitorNetwork(new Headers({ "x-real-ip": value }), true).ip,
      null,
    );
  assert.equal(
    visitorNetwork(new Headers({ "x-real-ip": "::ffff:198.51.100.7" }), true)
      .ip,
    "198.51.100.7",
  );
  assert.equal(visitorNetwork(new Headers({ "x-real-ip": "2001:0DB8:0000:0000:0000:0000:0000:0077" }), true).ip, "2001:db8::77");
});
test("visitor identifiers are keyed and fingerprints describe browser similarity rather than an IP", () => {
  const context = normalizeVisitorContext(input);
  assert.ok(context);
  const one = visitorKeys(
    context,
    "Mozilla/5.0 Chrome/130.0 Windows NT 10.0",
    "a".repeat(40),
  );
  const two = visitorKeys(
    { ...context, visitorToken: "22345678-1234-4321-8321-123456789012" },
    "Mozilla/5.0 Chrome/130.0 Windows NT 10.0",
    "a".repeat(40),
  );
  assert.notEqual(one.visitorId, two.visitorId);
  assert.equal(one.fingerprint, two.fingerprint);
  assert.notEqual(
    one.visitorId,
    visitorKeys(context, "same", "b".repeat(40)).visitorId,
  );
  assert.equal(one.visitorId.includes(token), false);
});
test("untrusted visitor signals and campaign attributes are bounded and validated", () => {
  assert.equal(
    normalizeVisitorContext({ ...input, visitorToken: "fake" }),
    null,
  );
  assert.equal(
    normalizeVisitorContext({
      ...input,
      signals: { timezone: "bad".repeat(100) },
    })?.signals.timezone,
    "",
  );
  assert.equal(normalizeCampaign("owner@example.com"), "");
  assert.equal(normalizeCampaign("Launch-2026"), "Launch-2026");
  assert.deepEqual(
    browserFamily("Mozilla/5.0 (Windows NT 10.0) Chrome/130.0 Edg/130.0"),
    { browser: "Edge", os: "Windows" },
  );
  assert.deepEqual(
    browserFamily("Mozilla/5.0 (iPhone) Version/18.0 Mobile Safari/604.1"),
    { browser: "Safari", os: "iOS" },
  );
});
