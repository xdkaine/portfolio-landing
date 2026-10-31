import assert from "node:assert/strict";
import { test } from "node:test";
import { getProject, listProjects, parseProjectQuery } from "./v2/catalog";
import { simulateUmaRequest } from "./v2/walkthrough";

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

test("console explanation reaches a ticket and proxy after the VM scope check", () => {
  const consoleFlow = simulateUmaRequest("member", "console");
  assert.equal(consoleFlow.allowed, true);
  assert.equal(consoleFlow.stoppedAt, null);
  assert.deepEqual(consoleFlow.steps.map((s) => s.id), [
    "identity", "policy", "ticket", "console",
  ]);
  for (const step of consoleFlow.steps) {
    assert.ok("source" in step && step.source);
    assert.match(step.source.href, /^https:\/\/github\.com\/xdkaine\/uma-proxmox-wrapper-public\/blob\/[a-f0-9]{40}\//);
  }
});

test("administrator policy comparison stops at scope without inventing a write or audit flow", () => {
  const accessFlow = simulateUmaRequest("administrator", "access");
  assert.equal(accessFlow.allowed, true);
  assert.equal(accessFlow.stoppedAt, null);
  assert.deepEqual(accessFlow.steps.map((s) => s.id), ["identity", "policy"]);
  assert.match(accessFlow.steps[1].description, /does not model a policy endpoint or database write/);
});
