import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const nginxConfig = readFileSync(
  path.join(process.cwd(), "nginx", "nginx.conf"),
  "utf8",
);
const proxyConfig = readFileSync(
  path.join(process.cwd(), "src", "proxy.ts"),
  "utf8",
);
const workflowConfig = readFileSync(
  path.join(process.cwd(), ".github", "workflows", "ci.yml"),
  "utf8",
);
const projectApiRoute = readFileSync(
  path.join(process.cwd(), "src", "app", "v1", "api", "projects", "route.ts"),
  "utf8",
);
const projectApiDetailRoute = readFileSync(
  path.join(process.cwd(), "src", "app", "v1", "api", "projects", "[id]", "route.ts"),
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
  const staticMissBlock = locationBlock("@next_static_miss");

  assert.match(staticBlock, /Cache-Control\s+"public, max-age=31536000, immutable"/);
  assert.doesNotMatch(staticBlock, /Cache-Control\s+"public, max-age=31536000, immutable"\s+always/);
  assert.match(staticBlock, /proxy_intercept_errors\s+on;/);
  assert.match(staticBlock, /error_page\s+404\s+=\s+@next_static_miss;/);
  assert.match(staticMissBlock, /Cache-Control\s+"no-store"\s+always/);
  assert.doesNotMatch(locationBlock("/"), /max-age=31536000|immutable/);
});

test("CSP permits Cloudflare verification and analytics endpoints", () => {
  for (const config of [nginxConfig, proxyConfig]) {
    assert.match(
      config,
      /script-src[^;]*https:\/\/challenges\.cloudflare\.com[^;]*https:\/\/static\.cloudflareinsights\.com/,
    );
    assert.match(
      config,
      /connect-src[^;]*https:\/\/challenges\.cloudflare\.com[^;]*https:\/\/cloudflareinsights\.com/,
    );
  }
});

test("nginx prevents stale dynamic responses from browser or edge caches", () => {
  for (const location of ["/v1/api/", "/"]) {
    const block = locationBlock(location);

    assert.match(block, /proxy_hide_header\s+Cache-Control;/);
    assert.match(block, /Cache-Control\s+"no-store, no-cache, max-age=0, must-revalidate"/);
    assert.match(block, /Pragma\s+"no-cache"/);
    assert.match(block, /Expires\s+"0"/);
  }
});

test("nginx applies security headers in locations with local cache headers", () => {
  assert.match(nginxConfig, /add_header_inherit\s+merge;/);

  for (const location of [
    "/v1/api/auth/",
    "/v1/api/contact",
    "/v1/api/uploads/",
    "/v1/api/",
    "/_next/static/",
    "/",
  ]) {
    assert.match(locationBlock(location), /add_header\s+Cache-Control/);
  }

  assert.match(nginxConfig, /Strict-Transport-Security/);
  assert.match(nginxConfig, /Content-Security-Policy/);
  assert.match(nginxConfig, /X-Frame-Options "DENY"/);
});

test("nginx hides application security headers where locations override proxy headers", () => {
  const hiddenHeaders = [
    "Content-Security-Policy",
    "Strict-Transport-Security",
    "X-Frame-Options",
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Cross-Origin-Opener-Policy",
    "Cross-Origin-Resource-Policy",
  ];

  for (const location of [
    "/v1/api/auth/",
    "/v1/api/contact",
    "/v1/api/uploads/",
    "/v1/api/",
    "/_next/static/",
    "/",
  ]) {
    const block = locationBlock(location);

    for (const header of hiddenHeaders) {
      assert.match(block, new RegExp(`proxy_hide_header\\s+${header};`));
    }
  }
});

test("large request bodies are limited to upload routes", () => {
  assert.match(nginxConfig, /client_max_body_size\s+1m;/);
  assert.match(locationBlock("/v1/api/uploads/"), /client_max_body_size\s+55m;/);
  assert.doesNotMatch(locationBlock("/v1/api/auth/"), /client_max_body_size\s+55m;/);
});

test("deployment reloads nginx in place after syncing mounted config", () => {
  assert.match(
    workflowConfig,
    /compose exec -T nginx nginx -t -c \/etc\/nginx\/portfolio\/nginx\.conf/,
  );
  assert.match(
    workflowConfig,
    /compose exec -T nginx nginx -s reload -c \/etc\/nginx\/portfolio\/nginx\.conf/,
  );
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
    /curl -fsS "\$PUBLIC_SITE_URL\/api\/health" \| grep -q "\\"revision\\":\\"\$GITHUB_SHA\\""/,
  );
});

test("deployment refuses local fallback images in production", () => {
  assert.match(workflowConfig, /Refusing to deploy without the immutable GHCR image/);
  assert.match(workflowConfig, /Refusing to deploy without the immutable migration image/);
  assert.match(workflowConfig, /running_app_image/);
});

test("deployment validates configuration and can restore the previous app image", () => {
  assert.match(workflowConfig, /compose config --quiet/);
  assert.match(workflowConfig, /POSTGRES_PASSWORD is missing from \$DEPLOY_PATH\/\.env/);
  assert.match(workflowConfig, /The running PostgreSQL database rejected POSTGRES_PASSWORD/);
  assert.match(workflowConfig, /compose exec -T -e PGPASSWORD="\$POSTGRES_PASSWORD" db psql -h 127\.0\.0\.1/);
  assert.match(workflowConfig, /compose exec -T -e PGPASSWORD="\$POSTGRES_PASSWORD" db pg_dump -h 127\.0\.0\.1/);
  assert.match(workflowConfig, /gzip -t "\$backup_path"/);
  assert.match(workflowConfig, /previous_app_image/);
  assert.match(workflowConfig, /compose up -d --no-deps app/);
});

test("container builds publish supply-chain attestations", () => {
  assert.match(workflowConfig, /sbom:\s+true/);
  assert.match(workflowConfig, /provenance:\s+mode=max/);
});

test("project API routes opt out of Next route caching", () => {
  for (const route of [projectApiRoute, projectApiDetailRoute]) {
    assert.match(route, /export const dynamic = "force-dynamic";/);
    assert.match(route, /export const revalidate = 0;/);
  }
});
