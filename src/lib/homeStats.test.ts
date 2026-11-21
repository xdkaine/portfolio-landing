import assert from "node:assert/strict";
import test from "node:test";
import { buildHomeStats } from "./homeStats";

test("home metrics use the entire catalog and deduplicate technology tags", () => {
  const stats = buildHomeStats([
    { status: "LIVE", tags: ["React", " Docker "] },
    { status: "IN PROGRESS", tags: ["react", "TypeScript"] },
    { status: "ARCHIVED", tags: ["", "Docker"] },
    { status: "LIVE", tags: ["PostgreSQL"] },
  ], 9);
  assert.deepEqual(Object.fromEntries(stats.map(item => [item.id, item.value])), { projects: 4, live: 2, technologies: 4, posts: 9 });
});

test("empty catalogs show zero instead of invented experience or response claims", () => {
  assert.deepEqual(buildHomeStats([], 0).map(item => item.value), [0, 0, 0, 0]);
});
