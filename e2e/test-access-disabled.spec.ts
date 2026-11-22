import { test, expect } from "@playwright/test";
test("owner-approved admin routes fail closed unless explicitly enabled", async ({
  request,
}) => {
  const id = "8c476c23-89f2-4a0d-b874-703ee35f00b9";
  for (const path of [
    "/v1/test-access",
    "/v1/test-access/verify",
    `/v1/test-access/approve/${id}`,
  ])
    expect((await request.get(path)).status()).toBe(404);
  for (const path of [
    "/v1/api/auth/test-access/request",
    `/v1/api/auth/test-access/${id}/complete`,
    `/v1/api/auth/test-access/${id}/decision`,
    "/v1/api/auth/test-access/logout",
  ])
    expect((await request.post(path, { data: {} })).status()).toBe(404);
  expect((await request.get("/v1")).ok()).toBeTruthy();
});
