import test from "node:test";
import assert from "node:assert/strict";
import { campaignIsQa, trafficFilter } from "./analyticsTraffic";
test("traffic classification uses explicit tags and bounded filter choices", () => {
  assert.equal(campaignIsQa({ campaignSource: "QA" }), true);
  assert.equal(campaignIsQa({ campaignName: "visitor-audit-20261031" }), true);
  assert.equal(campaignIsQa({ campaignSource: "internal" }), true);
  assert.equal(campaignIsQa({ campaignName: "quality-launch" }), false);
  assert.equal(campaignIsQa({}), false);
  assert.equal(trafficFilter("public"), "public");
  assert.equal(trafficFilter("qa"), "qa");
  assert.equal(trafficFilter("anything"), "all");
});
