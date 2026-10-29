import assert from "node:assert/strict";
import { test } from "node:test";
import { getProject, listProjects, parseProjectQuery } from "./catalog";
import { simulateUmaRequest } from "./walkthrough";

test("v2 discovery combines text and discipline without changing the catalog", () => {
  const all = listProjects();
  const filtered = listProjects({ q: "proxmox", discipline: "Infrastructure" });
  assert.ok(filtered.items.length > 0);
  assert.ok(
    filtered.items.every((p) => p.disciplines.includes("Infrastructure")),
  );
  assert.ok(filtered.items.some((p) => p.slug === "uma"));
  assert.equal(listProjects().total, all.total);
  assert.equal(listProjects({ q: "does-not-exist-9481" }).total, 0);
});

test("query parsing rejects unsupported values and bounds search input", () => {
  assert.throws(() =>
    parseProjectQuery(new URLSearchParams("discipline=invalid")),
  );
  assert.throws(() =>
    parseProjectQuery(new URLSearchParams({ q: "x".repeat(121) })),
  );
  assert.deepEqual(parseProjectQuery(new URLSearchParams("q=+LDAP+")), {
    q: "LDAP",
    discipline: "All",
  });
  assert.equal(getProject("__proto__"), undefined);
  assert.equal(getProject("missing"), undefined);
});

test("every project resolves to a complete independent v2 detail page", () => {
  for (const project of listProjects().items) {
    assert.match(project.slug, /^[a-z0-9-]+$/);
    assert.ok(project.summary.length > 30);
    assert.ok(getProject(project.slug)?.approach.length);
    assert.ok(project.href.startsWith("/v2/work/"));
  }
});

test("illustrated member ACL change stops before the infrastructure layer", () => {
  const result = simulateUmaRequest("member", "access");
  assert.equal(result.allowed, false);
  assert.equal(result.stoppedAt, "policy");
  assert.deepEqual(
    result.steps.map((s) => s.id),
    ["identity", "policy"],
  );
});

test("illustrated console and administrator flows reach their own destinations", () => {
  const consoleFlow = simulateUmaRequest("member", "console");
  assert.equal(consoleFlow.allowed, true);
  assert.ok(consoleFlow.steps.some((s) => s.id === "console"));
  const accessFlow = simulateUmaRequest("administrator", "access");
  assert.equal(accessFlow.allowed, true);
  assert.ok(accessFlow.steps.some((s) => s.id === "audit"));
  assert.ok(!accessFlow.steps.some((s) => s.id === "console"));
});
