import test from "node:test";
import assert from "node:assert/strict";
import {
  parseMessageUpdate,
  requireVersion,
  publicationIssues,
} from "./cmsRules";

test("inbox mutations accept only explicit bounded workflow fields", () => {
  assert.deepEqual(
    parseMessageUpdate({
      status: "RESOLVED",
      read: true,
      note: " Called back ",
    }),
    { status: "RESOLVED", read: true, note: "Called back" },
  );
  assert.throws(() => parseMessageUpdate({ status: "DELETED" }));
  assert.throws(() => parseMessageUpdate({ email: "changed@example.com" }));
  assert.throws(() => parseMessageUpdate({ note: "x".repeat(4001) }));
  assert.throws(() => parseMessageUpdate({ read: "false" }));
});

test("edit operations require an explicit integer version", () => {
  assert.equal(requireVersion({ version: 4 }), 4);
  for (const version of [undefined, 0, -1, "1", 1.5, NaN])
    assert.throws(() => requireVersion({ version }));
});

test("publication checklist distinguishes incomplete drafts from publishable content", () => {
  const fields = {
    title: "Article",
    slug: "article",
    excerpt: "An overview",
    coverImage: "",
    coverAlt: "",
    bodyJson: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "A complete article." }],
        },
      ],
    },
  };
  assert.deepEqual(publicationIssues(fields), []);
  assert.equal(
    publicationIssues({ ...fields, coverImage: "/v1/uploads/posts/image.png" })
      .length,
    1,
  );
  assert.ok(
    publicationIssues({ ...fields, title: "", bodyJson: null }).length >= 2,
  );
});
