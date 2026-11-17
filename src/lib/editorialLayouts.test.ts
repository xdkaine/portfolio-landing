import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePostDocument, missingImageAltCount, getPostHeadings, postDocumentText } from "./postContent";
import { normalizeProjectCaseStudyInput, serializeProjectCaseStudy, parseProjectCaseStudy, isSafeProjectImage } from "./projectCaseStudy";
import { DEFAULT_ABOUT_CONTENT, parseAboutContent } from "./aboutContent";
import { MarkdownManager } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import { contentTableExtensions } from "./contentTable";

const image = { type: "image", attrs: { src: "/v1/uploads/posts/photo.png", alt: "Service dashboard", caption: "Running services", layout: "wide" } };
const split = { type: "mediaText", attrs: { src: "/v1/uploads/posts/photo.png", alt: "Server rack", side: "left" }, content: [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "My infrastructure" }] }, { type: "paragraph", content: [{ type: "text", text: "A practical system." }] }] };

test("editorial layouts preserve layout and nested content through normalization", () => {
  const document = normalizePostDocument({ type: "doc", content: [split, { type: "carousel", content: [image, { ...image, attrs: { ...image.attrs, alt: "" } }] }] });
  assert.equal(document?.content?.[0].attrs?.side, "left");
  assert.equal(document?.content?.[1].content?.[0].attrs?.layout, "wide");
  assert.equal(missingImageAltCount(document), 1);
  assert.deepEqual(getPostHeadings(document), [{ id: "my-infrastructure", level: 2, text: "My infrastructure" }]);
  assert.match(postDocumentText(document), /A practical system/);
  assert.deepEqual(normalizePostDocument(document), document);
});

test("new media layouts retain the existing post and project source boundaries", () => {
  const projectImage = { ...image, attrs: { ...image.attrs, src: "/v1/uploads/projects/photo.png" } };
  assert.equal(normalizePostDocument({ type: "doc", content: [projectImage] })?.content?.length, 0);
  assert.equal(normalizePostDocument({ type: "doc", content: [projectImage] }, isSafeProjectImage)?.content?.length, 1);
  const unsafe = { ...split, attrs: { src: "javascript:alert(1)", side: "invalid" } };
  assert.equal(normalizePostDocument({ type: "doc", content: [unsafe] })?.content?.length, 0);
  const gallery = normalizePostDocument({ type: "doc", content: [{ type: "carousel", content: [{ ...image, attrs: { src: "data:image/png;base64,AAA" } }, image] }] });
  assert.equal(gallery?.content?.[0].content?.length, 1);
});

test("project stories survive a CMS save without losing legacy writeups or galleries", () => {
  const bodyJson = { type: "doc", content: [{ ...split, attrs: { ...split.attrs, src: "/v1/uploads/projects/rack.png" } }] };
  const content = normalizeProjectCaseStudyInput({ bodyJson, writeupMarkdown: "Original **write-up**", challenge: "Existing context", gallery: [{ image: "/v1/uploads/projects/rack.png", title: "Rack", alt: "A rack", caption: "Existing caption" }] });
  assert.ok(content);
  assert.deepEqual(parseProjectCaseStudy(serializeProjectCaseStudy(content)), content);
  assert.equal(content.bodyJson?.content?.[0].attrs?.src, "/v1/uploads/projects/rack.png");
  assert.equal(content.writeupMarkdown, "Original **write-up**");
  assert.equal(content.gallery?.[0].caption, "Existing caption");
});

test("About defaults round-trip and reject oversized or malformed editing payloads", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(parseAboutContent(DEFAULT_ABOUT_CONTENT))), DEFAULT_ABOUT_CONTENT);
  assert.throws(() => parseAboutContent({ ...DEFAULT_ABOUT_CONTENT, title: "x".repeat(181) }), /title/);
  assert.throws(() => parseAboutContent({ ...DEFAULT_ABOUT_CONTENT, techGroups: [{ category: "Tools", items: [42] }] }), /tech group/);
  assert.throws(() => parseAboutContent({ ...DEFAULT_ABOUT_CONTENT, bodyJson: null }), /document/);
  assert.throws(() => parseAboutContent({ ...DEFAULT_ABOUT_CONTENT, personalNote: "x".repeat(100001) }), /100 KB/);
});

test("legacy tables retain every cell when converted to a visual document", () => {
  const manager = new MarkdownManager({ extensions: [StarterKit, ...contentTableExtensions] });
  const document = normalizePostDocument(manager.parse("Before\n\n| Keep me | Preserve me |\n| --- | --- |\n| **One** | Two |\n\nAfter"));
  assert.match(postDocumentText(document), /Before Keep me Preserve me One Two After/);
  assert.equal(document?.content?.some(node => node.type === "table"), true);
  assert.deepEqual(normalizePostDocument(document), document);
});

test("long split stories are preserved and oversized documents fail instead of truncating", () => {
  const paragraphs = Array.from({ length: 101 }, (_, i) => ({ type: "paragraph", content: [{ type: "text", text: `Paragraph ${i}` }] }));
  const document = normalizePostDocument({ type: "doc", content: [{ ...split, content: paragraphs }] });
  assert.equal(document?.content?.[0].content?.length, 101);
  assert.match(postDocumentText(document), /Paragraph 100/);
  assert.equal(normalizePostDocument({ type: "doc", content: [{ type: "carousel", content: Array.from({ length: 31 }, () => image) }] }), null);
});
