import test from "node:test";
import assert from "node:assert/strict";
import {
  calculatePostReadTime,
  createPostSlug,
  getPostHeadings,
  hasPostBody,
  missingImageAltCount,
  normalizePostDocument,
} from "@/lib/postContent";

test("creates stable URL slugs from article titles", () => {
  assert.equal(createPostSlug("  Building a WebGL Renderer!  "), "building-a-webgl-renderer");
});

test("calculates reading time from structured content", () => {
  const document = normalizePostDocument({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: `${"word ".repeat(201)}` }] }],
  });
  assert.equal(calculatePostReadTime(document), "2 MIN");
  assert.equal(hasPostBody(document), true);
});

test("strips unsupported rich content and unsafe URLs", () => {
  const document = normalizePostDocument({
    type: "doc",
    content: [
      { type: "script", content: [{ type: "text", text: "bad" }] },
      { type: "image", attrs: { src: "javascript:alert(1)", alt: "bad" } },
      { type: "paragraph", content: [{ type: "text", text: "Safe" }] },
    ],
  });
  assert.deepEqual(document?.content, [
    { type: "paragraph", content: [{ type: "text", text: "Safe", marks: undefined }] },
  ]);
});

test("generates unique heading anchors and detects missing image alt text", () => {
  const document = normalizePostDocument({
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "System Design" }] },
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "System Design" }] },
      { type: "image", attrs: { src: "/uploads/posts/frame.webp", alt: "" } },
    ],
  });
  assert.deepEqual(getPostHeadings(document), [
    { id: "system-design", level: 2, text: "System Design" },
    { id: "system-design-2", level: 2, text: "System Design" },
  ]);
  assert.equal(missingImageAltCount(document), 1);
});
