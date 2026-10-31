import "server-only";

import { getPublishedPostBySlug, listPublishedPosts } from "@/lib/postEditorial";
import { createWritingService } from "@/lib/v2/writing";

// This is the only v2 editorial boundary. The environment's existing CMS owns
// publication, future published snapshots, storage, and all authoring writes.
export const { listWriting, getWriting } = createWritingService({
  list: () => listPublishedPosts(),
  get: getPublishedPostBySlug,
});
