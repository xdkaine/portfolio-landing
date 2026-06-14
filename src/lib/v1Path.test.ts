import assert from "node:assert/strict";
import test from "node:test";
import { normalizeV1PublicUrl } from "@/lib/v1Path";

test("normalizes legacy public media URLs under /v1", () => {
  assert.equal(
    normalizeV1PublicUrl("/uploads/posts/cover.webp"),
    "/v1/uploads/posts/cover.webp",
  );
  assert.equal(
    normalizeV1PublicUrl("/uploads/projects/frame.webp"),
    "/v1/uploads/projects/frame.webp",
  );
  assert.equal(
    normalizeV1PublicUrl("/projects/system-flow.svg"),
    "/v1/assets/projects/system-flow.svg",
  );
  assert.equal(normalizeV1PublicUrl("/projects/01"), "/projects/01");
});

test("leaves migrated, external, anchor, and empty URLs unchanged", () => {
  assert.equal(
    normalizeV1PublicUrl("/v1/uploads/posts/cover.webp"),
    "/v1/uploads/posts/cover.webp",
  );
  assert.equal(normalizeV1PublicUrl("https://example.com/image.webp"), "https://example.com/image.webp");
  assert.equal(normalizeV1PublicUrl("#section"), "#section");
  assert.equal(normalizeV1PublicUrl(""), "");
});
