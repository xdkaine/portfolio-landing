import { test, expect } from "@playwright/test";

test("legacy public V1 URLs redirect to V2 while shared service addresses stay intact", async ({ request, baseURL }) => {
  const paths = ["", "/projects", "/projects/1", "/blog", "/blog/building-my-homelab", "/about", "/contact", "/privacy", "/terms", "/feed.xml", "/opengraph-image"];
  for (const path of paths) {
    const response = await request.get(`/v1${path}?from=legacy`, { maxRedirects: 0 });
    expect(response.status(), path).toBe(307);
    const destination = new URL(response.headers().location, baseURL);
    expect(destination.pathname, path).toBe(`/v2${path}`);
    expect(destination.searchParams.get("from")).toBe("legacy");
  }
  expect((await request.get("/v1/api/health", { maxRedirects: 0 })).status()).toBe(200);
  expect((await request.get("/v1/api/auth/session", { maxRedirects: 0 })).status()).toBe(401);
  expect((await request.get("/v1/login", { maxRedirects: 0 })).status()).toBe(200);
  const admin = await request.get("/v1/admin", { maxRedirects: 0 });
  expect(admin.status()).toBe(307);
  expect(new URL(admin.headers().location, baseURL).pathname).toBe("/v1/login");
  const media = await request.head("/v1/assets/media/chuckles-loop.gif", { maxRedirects: 0 });
  expect(media.status()).toBe(200);
  expect(media.headers()["content-type"]).toContain("image/gif");
});
