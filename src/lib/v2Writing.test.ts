import assert from "node:assert/strict";
import { test } from "node:test";
import { ProjectQueryError } from "./v2/catalog";
import { createLibraryLoader, parseLibraryQuery } from "./v2/library";
import {
  createWritingService,
  parseWritingQuery,
  writingForProject,
  WritingUnavailableError,
  type PublishedWritingArticleSource,
  type PublishedWritingSummarySource,
} from "./v2/writing";
import { writingErrorResponse } from "./v2/writingHttp";

function article(overrides: Partial<PublishedWritingArticleSource> = {}): PublishedWritingArticleSource {
  return {
    slug: "test-published-note",
    title: "Published infrastructure note",
    excerpt: "A disposable unit-test article about directory access.",
    date: "2026.10.31",
    publishedAt: "2026-10-31T00:00:00.000Z",
    updatedAt: "2026-10-31T00:00:00.000Z",
    readTime: "1 MIN",
    tags: ["Infrastructure"],
    coverImage: "/uploads/posts/test-cover.png",
    coverAlt: "Disposable test image",
    featured: false,
    status: "PUBLISHED",
    published: true,
    bodyJson: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Published body." }] }],
    },
    content: null,
    ...overrides,
  };
}

function service(posts: PublishedWritingArticleSource[]) {
  return createWritingService({
    list: async () => posts,
    get: async slug => posts.find(post => post.slug === slug) ?? null,
  });
}

test("v2 writing exposes an explicit public DTO and rejects explicit non-public states", async () => {
  const publicSource = { ...article(), id: "internal-id", version: 12, hasUnpublishedChanges: true, needsContent: false };
  const posts = [
    publicSource,
    article({ slug: "draft-note", status: "DRAFT", published: true }),
    article({ slug: "archived-note", status: "ARCHIVED", published: true }),
    article({ slug: "unpublished-note", published: false }),
    article({ slug: "deleted-note", deletedAt: "2026-10-31" }),
  ];
  const store = service(posts);
  const result = await store.listWriting();
  assert.equal(result.total, 1);
  assert.equal(result.items[0].href, "/v2/writing/test-published-note");
  assert.equal(result.items[0].coverImage, "/v1/uploads/posts/test-cover.png");
  const detail = await store.getWriting(publicSource.slug);
  assert.ok(detail);
  for (const value of [result.items[0], detail]) {
    for (const field of ["id", "status", "published", "version", "hasUnpublishedChanges", "needsContent", "deletedAt", "createdAt"]) {
      assert.equal(Object.hasOwn(value, field), false, `${field} is not a v2 public field`);
    }
  }
  for (const post of posts.slice(1)) assert.equal(await store.getWriting(post.slug), null);
});

test("published summary readers need not expose admin publication fields", async () => {
  const source: PublishedWritingSummarySource = article();
  delete source.status;
  delete source.published;
  const store = createWritingService({ list: async () => [source], get: async () => null });
  assert.equal((await store.listWriting()).total, 1);
});

test("empty and filtered writing remain empty without fallback content", async () => {
  assert.deepEqual((await service([]).listWriting()).items, []);
  const store = service([article()]);
  assert.equal((await store.listWriting({ q: "DIRECTORY infrastructure", discipline: "Infrastructure" })).total, 1);
  assert.equal((await store.listWriting({ q: "directory missing-word" })).total, 0);
  assert.equal((await store.listWriting({ discipline: "Applications" })).total, 0);
});

test("curated relationships connect only SDC Cloud to the isolated-lab article", async () => {
  const store = service([
    article({ slug: "building-my-homelab", tags: [] }),
    article({ slug: "building-the-satono-diamond-center1", tags: [] }),
    article({ slug: "another-published-note", tags: [] }),
  ]);
  const { items } = await store.listWriting();
  assert.equal(items.length, 3, "newly published articles are not limited to the curated relation map");
  assert.deepEqual(writingForProject(items, "sdc-cloud").map(item => item.slug), ["building-the-satono-diamond-center1"]);
  assert.deepEqual(writingForProject(items, "uma"), []);
  assert.deepEqual(writingForProject(items, "uar"), []);
  assert.deepEqual(items[0].relatedProjects, []);
  assert.deepEqual(items[2].disciplines, []);
  assert.equal((await store.listWriting({ discipline: "Infrastructure" })).total, 2);
});

test("article documents are normalized and empty documents allow the legacy fallback", async () => {
  const store = service([
    article({
      slug: "normalized-note",
      coverImage: "javascript:alert(1)",
      bodyJson: { type: "doc", content: [
        { type: "script", text: "bad" },
        { type: "image", attrs: { src: "javascript:alert(1)", alt: "bad" } },
        { type: "paragraph", content: [{ type: "text", text: "Safe body", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] },
      ] },
    }),
    article({ slug: "legacy-note", bodyJson: { type: "doc", content: [{ type: "paragraph" }] }, content: "## Legacy published body" }),
  ]);
  const detail = await store.getWriting("normalized-note");
  assert.equal(detail?.coverImage, null);
  assert.equal(detail?.coverAlt, null);
  assert.deepEqual(detail?.bodyJson?.content, [{ type: "paragraph", content: [{ type: "text", text: "Safe body", marks: undefined }] }]);
  const legacy = await store.getWriting("legacy-note");
  assert.equal(legacy?.bodyJson, null);
  assert.equal(legacy?.content, "## Legacy published body");
});

test("missing and invalid slugs do not expose another record", async () => {
  let reads = 0;
  const store = createWritingService({
    list: async () => [],
    get: async () => { reads += 1; return article(); },
  });
  assert.equal(await store.getWriting("../draft"), null);
  assert.equal(await store.getWriting("x".repeat(121)), null);
  assert.equal(reads, 0);
  assert.equal(await store.getWriting("different-published-note"), null);
  assert.equal(reads, 1);
  assert.equal(await service([]).getWriting("missing-note"), null);
});

test("query parsing preserves valid inputs and rejects invalid filters", () => {
  assert.deepEqual(parseWritingQuery(new URLSearchParams("q=+LDAP+")), { q: "LDAP", discipline: "All" });
  assert.deepEqual(parseLibraryQuery(new URLSearchParams("kind=writing&q=+LDAP+")), { q: "LDAP", discipline: "All", kind: "writing" });
  for (const params of [new URLSearchParams("discipline=invalid"), new URLSearchParams({ q: "x".repeat(121) })]) {
    assert.throws(() => parseWritingQuery(params), ProjectQueryError);
  }
  assert.throws(() => parseLibraryQuery(new URLSearchParams("kind=invalid")), ProjectQueryError);
});

test("library groups projects and writing without inventing a combined chronology", async () => {
  const load = createLibraryLoader(service([article()]).listWriting);
  const result = await load(parseLibraryQuery(new URLSearchParams()));
  assert.ok(result.projects.total > 0);
  assert.equal(result.writing.total, 1);
  assert.equal(result.total, result.projects.total + 1);
  const writingOnly = await load(parseLibraryQuery(new URLSearchParams("kind=writing")));
  assert.equal(writingOnly.projects.total, 0);
  assert.equal(writingOnly.writing.total, 1);
});

test("reader failures are unavailable errors, and project-only discovery stays independent", async () => {
  const store = createWritingService({
    list: async () => { throw new Error("private database detail"); },
    get: async () => { throw new Error("private database detail"); },
  });
  await assert.rejects(store.listWriting(), WritingUnavailableError);
  await assert.rejects(store.getWriting("published-note"), WritingUnavailableError);
  const load = createLibraryLoader(store.listWriting);
  await assert.rejects(load(parseLibraryQuery(new URLSearchParams())), WritingUnavailableError);
  const projects = await load(parseLibraryQuery(new URLSearchParams("kind=projects")));
  assert.ok(projects.projects.total > 0);
  assert.equal(projects.writing.total, 0);
});

test("API errors distinguish invalid input from unavailable content without leaking internals", async () => {
  const invalid = writingErrorResponse(new ProjectQueryError("Choose a valid filter."));
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error.code, "INVALID_QUERY");
  const unavailable = writingErrorResponse(new Error("private database detail"));
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get("Cache-Control"), "no-store");
  assert.equal(unavailable.headers.get("X-Robots-Tag"), "noindex");
  const payload = await unavailable.json();
  assert.equal(payload.error.code, "CONTENT_UNAVAILABLE");
  assert.equal(JSON.stringify(payload).includes("private database detail"), false);
  assert.equal(Object.hasOwn(payload, "data"), false);
});
