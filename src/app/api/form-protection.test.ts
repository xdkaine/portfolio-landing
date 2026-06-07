import test from "node:test";
import assert from "node:assert/strict";
import { POST as contactPost } from "@/app/api/contact/route";
import { POST as loginPost } from "@/app/api/auth/login/route";
import { GET as turnstileConfigGet } from "@/app/api/turnstile/route";

const originalTurnstileSecret = process.env.TURNSTILE_SECRET_KEY;
const originalTurnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const originalRuntimeTurnstileSiteKey = process.env.TURNSTILE_SITE_KEY;
const originalFetch = globalThis.fetch;

function restoreTurnstileSecret() {
  globalThis.fetch = originalFetch;

  if (originalTurnstileSecret === undefined) {
    delete process.env.TURNSTILE_SECRET_KEY;
    return;
  }

  process.env.TURNSTILE_SECRET_KEY = originalTurnstileSecret;
}

function restoreTurnstileConfig() {
  restoreTurnstileSecret();

  if (originalRuntimeTurnstileSiteKey === undefined) {
    delete process.env.TURNSTILE_SITE_KEY;
  } else {
    process.env.TURNSTILE_SITE_KEY = originalRuntimeTurnstileSiteKey;
  }

  if (originalTurnstileSiteKey === undefined) {
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    return;
  }

  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = originalTurnstileSiteKey;
}

function jsonRequest(path: string, body: Record<string, unknown>) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost",
      "Sec-Fetch-Site": "same-origin",
    },
    body: JSON.stringify(body),
  });
}

test("contact submissions require a Turnstile token when configured", async (t) => {
  process.env.TURNSTILE_SECRET_KEY = "test-secret";
  t.after(restoreTurnstileSecret);

  const response = await contactPost(
    jsonRequest("/api/contact", {
      name: "Ada Lovelace",
      email: "ada@example.com",
      message: "Hello.",
      consent: true,
    }),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Verification required" });
});

test("Turnstile config exposes the runtime site key when verification is required", async (t) => {
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "compiled-site-key";
  process.env.TURNSTILE_SITE_KEY = "runtime-site-key";
  process.env.TURNSTILE_SECRET_KEY = "test-secret";
  t.after(restoreTurnstileConfig);

  const response = await turnstileConfigGet();

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    siteKey: "runtime-site-key",
    required: true,
  });
});

test("login attempts require a Turnstile token when configured", async (t) => {
  process.env.TURNSTILE_SECRET_KEY = "test-secret";
  t.after(restoreTurnstileSecret);

  const response = await loginPost(
    jsonRequest("/api/auth/login", {
      email: "admin@example.com",
      password: "correct-horse-battery-staple",
    }),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Verification required" });
});

test("login reports the Cloudflare verification rejection code", async (t) => {
  process.env.TURNSTILE_SECRET_KEY = "test-secret";
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        success: false,
        "error-codes": ["timeout-or-duplicate"],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  t.after(restoreTurnstileSecret);

  const response = await loginPost(
    jsonRequest("/api/auth/login", {
      email: "admin@example.com",
      password: "correct-horse-battery-staple",
      turnstileToken: "expired-token",
    }),
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    error: "Verification failed",
    verificationCode: "timeout-or-duplicate",
  });
});
