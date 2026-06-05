import test from "node:test";
import assert from "node:assert/strict";
import { POST as contactPost } from "@/app/api/contact/route";
import { POST as loginPost } from "@/app/api/auth/login/route";

const originalTurnstileSecret = process.env.TURNSTILE_SECRET_KEY;

function restoreTurnstileSecret() {
  if (originalTurnstileSecret === undefined) {
    delete process.env.TURNSTILE_SECRET_KEY;
    return;
  }

  process.env.TURNSTILE_SECRET_KEY = originalTurnstileSecret;
}

function jsonRequest(path: string, body: Record<string, unknown>) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
