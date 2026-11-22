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
  for (const location of ["= /v1/api/auth/session", "/v1/api/", "/"]) {
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
    "= /v1/api/auth/session",
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
    "= /v1/api/auth/session",
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

test("navigation session checks cannot exhaust the strict sign-in allowance", () => {
  const resources = JSON.parse(readFileSync(path.join(process.cwd(), "deploy/k3s/resources.json"), "utf8"));
  const deployedConfig = resources.items.find((item: { kind: string; metadata: { name: string } }) =>
    item.kind === "ConfigMap" && item.metadata.name === "nginx-config",
  ).data["nginx.conf"] as string;
  const testConfig = readFileSync(path.join(process.cwd(), "nginx/nginx.test.conf"), "utf8");

  for (const config of [nginxConfig, testConfig, deployedConfig]) {
    const session = config.match(/location = \/v1\/api\/auth\/session \{([\s\S]*?)\n\s*\}/)?.[1];
    const auth = config.match(/location \/v1\/api\/auth\/ \{([\s\S]*?)\n\s*\}/)?.[1];
    assert.ok(session);
    assert.ok(auth);
    assert.match(session, /limit_req zone=api burst=20 nodelay;/);
    assert.doesNotMatch(session, /zone=auth/);
    assert.match(session, /proxy_set_header X-Forwarded-For \$trusted_client_ip;/);
    assert.match(session, /Cache-Control "no-store, no-cache, max-age=0, must-revalidate"/);
    assert.match(auth, /limit_req zone=auth burst=5 nodelay;/);
  }
  for (const config of [nginxConfig, deployedConfig]) {
    assert.match(config, /zone=auth:10m rate=3r\/m;/);
  }
});



test("nginx re-resolves the app service after container replacement", () => {
  assert.match(nginxConfig, /resolver\s+127\.0\.0\.11\s+valid=1s\s+ipv6=off;/);
  assert.match(nginxConfig, /set\s+\$nextjs_upstream\s+http:\/\/app:3000;/);
  assert.doesNotMatch(nginxConfig, /upstream\s+nextjs/);
});









test("container delivery uses the private local runner without publishing build artifacts", () => {
  assert.match(workflowConfig, /runs-on:\s*\[self-hosted, Linux, X64, portfolio-local\]/);
  assert.match(workflowConfig, /k3s-ci-job python3 deploy\/k3s\/local-ci\.py/);
  assert.doesNotMatch(workflowConfig, /upload-artifact|build-push-action|gh release|packages:\s*write|cache-to:\s*type=gha/);
});

test("project API routes opt out of Next route caching", () => {
  for (const route of [projectApiRoute, projectApiDetailRoute]) {
    assert.match(route, /export const dynamic = "force-dynamic";/);
    assert.match(route, /export const revalidate = 0;/);
  }
});
