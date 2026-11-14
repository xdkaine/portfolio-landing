import assert from "node:assert/strict";
import test from "node:test";
import { getProjectActions } from "./projectPresentation";

test("a repository entered as both demo and source is one truthful source action", () => {
  assert.deepEqual(getProjectActions("https://github.com/owner/project/", "https://github.com/owner/project"), [
    { href: "https://github.com/owner/project", label: "View source", kind: "source" },
  ]);
});

test("a repository without a separate source field is still labeled as source", () => {
  assert.deepEqual(getProjectActions("https://github.com/owner/project"), [
    { href: "https://github.com/owner/project", label: "View source", kind: "source" },
  ]);
});

test("a real demo and a repository remain separate destinations", () => {
  assert.deepEqual(getProjectActions("https://demo.example.org", "https://github.com/owner/project").map(action => action.kind), ["demo", "source"]);
  assert.deepEqual(getProjectActions("javascript:alert(1)", ""), []);
});
