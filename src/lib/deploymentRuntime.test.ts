import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const dockerfile = readFileSync(path.join(process.cwd(), "Dockerfile"), "utf8");
const composeConfig = readFileSync(path.join(process.cwd(), "docker-compose.yml"), "utf8");
const gitAttributes = readFileSync(path.join(process.cwd(), ".gitattributes"), "utf8");
const healthRoute = readFileSync(
  path.join(process.cwd(), "src", "app", "v1", "api", "health", "route.ts"),
  "utf8",
);
const standaloneSanitizer = readFileSync(
  path.join(process.cwd(), "scripts", "sanitize-standalone.mjs"),
  "utf8",
);
const adminDashboard = readFileSync(
  path.join(process.cwd(), "src", "components", "AdminDashboardClient.tsx"),
  "utf8",
);
const serverLauncher = readFileSync(
  path.join(process.cwd(), "scripts", "start-server.mjs"),
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
  assert.match(dockerfile, /CMD \["node", "scripts\/start-server\.mjs"\]/);
  assert.match(serverLauncher, /assertProductionRuntimeConfiguration\(\)/);
  assert.match(gitAttributes, /Dockerfile text eol=lf/);
  const runnerStage = dockerfile.slice(dockerfile.indexOf("FROM node:26-alpine AS runner"));
  assert.doesNotMatch(runnerStage, /COPY --from=prisma .*node_modules/);
});

test("migration tooling is isolated from the web runtime", () => {
  assert.match(dockerfile, /FROM node:26-alpine AS migrate/);
  assert.match(
    dockerfile,
    /CMD \["\.\/node_modules\/\.bin\/prisma", "migrate", "deploy"\]/,
  );
  assert.match(composeConfig, /app:\s*\n\s*image:/);
  assert.match(composeConfig, /depends_on:\s*\n\s*db:\s*\n\s*condition: service_healthy/);
});

test("standalone releases remove secrets and source material", () => {
  for (const forbiddenEntry of [
    ".env",
    "compose.runner.yml",
    "docker-compose.yml",
    "docs",
    "nginx",
    "src",
  ]) {
    assert.match(standaloneSanitizer, new RegExp(`"${forbiddenEntry.replace(".", "\\.")}"`));
  }
});

test("compose mounts uploads without shadowing built public assets", () => {
  assert.match(composeConfig, /project_uploads:\/app\/uploads\/projects/);
  assert.match(composeConfig, /post_uploads:\/app\/uploads\/posts/);
  assert.match(composeConfig, /public_data:\/app\/legacy-public:ro/);
  assert.doesNotMatch(composeConfig, /public_data:\/app\/public/);
});

test("nginx is immutable, self-contained, and pinned", () => {
  assert.match(
    composeConfig,
    /image: nginx:1\.31\.1-alpine@sha256:[a-f0-9]{64}/,
  );
  assert.match(composeConfig, /\.\/nginx:\/etc\/nginx\/portfolio:ro/);
  assert.match(
    composeConfig,
    /command: \["nginx", "-g", "daemon off;", "-c", "\/etc\/nginx\/portfolio\/nginx\.conf"\]/,
  );
  assert.match(composeConfig, /read_only: true/);
  for (const capability of ["CHOWN", "NET_BIND_SERVICE", "SETGID", "SETUID"]) {
    assert.match(composeConfig, new RegExp(`- ${capability}`));
  }
});

test("health route exposes the running app revision", () => {
  assert.match(healthRoute, /revision: process\.env\.APP_REVISION \?\? "unknown"/);
});

test("project upload controls advertise only server-supported raster formats", () => {
  assert.doesNotMatch(adminDashboard, /accept="[^"]*image\/svg\+xml/);
  assert.match(
    adminDashboard,
    /accept="image\/png,image\/jpeg,image\/webp,image\/gif"/,
  );
});
