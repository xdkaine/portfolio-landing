import assert from "node:assert/strict";
import { test } from "node:test";
import { getProjectTeaser } from "./projectTeaser";

test("homepage uses the editorial summary without changing the stored write-up", () => {
  const project = { description: "Full case study. ".repeat(100), caseStudy: { subtitle: "An access request portal backed by Active Directory." } };
  const original = structuredClone(project);
  assert.equal(getProjectTeaser(project), project.caseStudy.subtitle);
  assert.deepEqual(project, original);
});

test("legacy projects use a bounded, readable teaser with no CSS clipping", () => {
  const project = { description: "This project makes shared infrastructure easier to operate through a purpose-built application. " + "More background and implementation detail. ".repeat(30) };
  assert.equal(getProjectTeaser(project), "This project makes shared infrastructure easier to operate through a purpose-built application.");
  const uninterrupted = getProjectTeaser({ description: "Infrastructure workflows ".repeat(30) });
  assert(uninterrupted.length <= 220);
  assert(uninterrupted.endsWith("workflows…") || uninterrupted.endsWith("Infrastructure…"));
  assert.equal(getProjectTeaser({ description: "  Short description.  ", caseStudy: { subtitle: " ", pitch: "Legacy pitch." } }), "Legacy pitch.");
});
