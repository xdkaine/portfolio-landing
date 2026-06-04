import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const dockerfile = readFileSync(path.join(process.cwd(), "Dockerfile"), "utf8");
const composeConfig = readFileSync(path.join(process.cwd(), "docker-compose.yml"), "utf8");
const gitAttributes = readFileSync(path.join(process.cwd(), ".gitattributes"), "utf8");
const healthRoute = readFileSync(
  path.join(process.cwd(), "src", "app", "api", "health", "route.ts"),
  "utf8",
);

test("app image runs directly without a docker entrypoint", () => {
  assert.doesNotMatch(dockerfile, /docker-entrypoint|su-exec|public-seed/);
  assert.match(dockerfile, /ENTRYPOINT \[\]/);
  assert.match(dockerfile, /USER nextjs/);
  assert.match(dockerfile, /PROJECT_IMAGE_UPLOAD_DIR=\/app\/uploads\/projects/);
  assert.match(dockerfile, /POST_IMAGE_UPLOAD_DIR=\/app\/uploads\/posts/);
  assert.match(dockerfile, /ARG APP_REVISION=local/);
  assert.match(dockerfile, /ENV APP_REVISION=\$APP_REVISION/);
  assert.match(gitAttributes, /Dockerfile text eol=lf/);
});

test("compose mounts uploads without shadowing built public assets", () => {
  assert.match(composeConfig, /project_uploads:\/app\/uploads\/projects/);
  assert.match(composeConfig, /post_uploads:\/app\/uploads\/posts/);
  assert.match(composeConfig, /public_data:\/app\/legacy-public:ro/);
  assert.doesNotMatch(composeConfig, /public_data:\/app\/public/);
});

test("health route exposes the running app revision", () => {
  assert.match(healthRoute, /revision: process\.env\.APP_REVISION \?\? "unknown"/);
});
