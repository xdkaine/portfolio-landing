import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const nginxConfig = readFileSync(
  path.join(process.cwd(), "nginx", "nginx.conf"),
  "utf8",
);
const workflowConfig = readFileSync(
  path.join(process.cwd(), ".github", "workflows", "ci.yml"),
  "utf8",
);
const projectApiRoute = readFileSync(
  path.join(process.cwd(), "src", "app", "api", "projects", "route.ts"),
  "utf8",
);
const projectApiDetailRoute = readFileSync(
  path.join(process.cwd(), "src", "app", "api", "projects", "[id]", "route.ts"),
  "utf8",
);

function locationBlock(location: string) {
  const escapedLocation = location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = nginxConfig.match(
    new RegExp(`location\\s+${escapedLocation}\\s*\\{([\\s\\S]*?)\\n\\s*\\}`, "m"),
  );
  assert.ok(match, `expected nginx location ${location} to exist`);
  return match[1];
}

test("nginx only caches fingerprinted Next.js build assets long-term", () => {
  const staticBlock = locationBlock("/_next/static/");

  assert.match(staticBlock, /Cache-Control\s+"public, max-age=31536000, immutable"/);
  assert.doesNotMatch(locationBlock("/"), /max-age=31536000|immutable/);
});

test("nginx prevents stale dynamic responses from browser or edge caches", () => {
  for (const location of ["/api/", "/"]) {
    const block = locationBlock(location);

    assert.match(block, /proxy_hide_header\s+Cache-Control;/);
    assert.match(block, /Cache-Control\s+"no-store, no-cache, max-age=0, must-revalidate"/);
    assert.match(block, /Pragma\s+"no-cache"/);
    assert.match(block, /Expires\s+"0"/);
  }
});

test("deployment reloads nginx in place after syncing mounted config", () => {
  assert.match(workflowConfig, /compose exec -T nginx nginx -t/);
  assert.match(workflowConfig, /compose exec -T nginx nginx -s reload/);
  assert.doesNotMatch(workflowConfig, /force-recreate --no-deps nginx/);
});

test("nginx re-resolves the app service after container replacement", () => {
  assert.match(nginxConfig, /resolver\s+127\.0\.0\.11\s+valid=1s\s+ipv6=off;/);
  assert.match(nginxConfig, /set\s+\$nextjs_upstream\s+http:\/\/app:3000;/);
  assert.doesNotMatch(nginxConfig, /upstream\s+nextjs/);
});

test("deployment verifies app health through nginx", () => {
  assert.match(
    workflowConfig,
    /compose exec -T nginx wget -q -O - http:\/\/127\.0\.0\.1\/api\/health \| grep -q "\\"revision\\":\\"\$GITHUB_SHA\\""/,
  );
});

test("deployment verifies the public route reaches the same revision", () => {
  assert.match(
    workflowConfig,
    /curl -fsS "\$NEXT_PUBLIC_SITE_URL\/api\/health" \| grep -q "\\"revision\\":\\"\$GITHUB_SHA\\""/,
  );
});

test("deployment refuses local fallback images in production", () => {
  assert.match(workflowConfig, /Refusing to deploy without the immutable GHCR image/);
  assert.match(workflowConfig, /running_app_image/);
});

test("project API routes opt out of Next route caching", () => {
  for (const route of [projectApiRoute, projectApiDetailRoute]) {
    assert.match(route, /export const dynamic = "force-dynamic";/);
    assert.match(route, /export const revalidate = 0;/);
  }
});
