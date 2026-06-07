import test from "node:test";
import assert from "node:assert/strict";
import { verifyTurnstile } from "@/lib/turnstile";

const originalSecret = process.env.TURNSTILE_SECRET_KEY;
const originalFetch = globalThis.fetch;

function restoreEnvironment() {
  if (originalSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
  else process.env.TURNSTILE_SECRET_KEY = originalSecret;

  globalThis.fetch = originalFetch;
}

test("Turnstile verification does not send a forwarded remote IP", async (t) => {
  t.after(restoreEnvironment);
  process.env.TURNSTILE_SECRET_KEY = "test-secret";

  let verificationBody = "";
  globalThis.fetch = async (_input, init) => {
    verificationBody = String(init?.body);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  assert.deepEqual(await verifyTurnstile("test-token"), {
    success: true,
    errorCodes: [],
    hostname: undefined,
  });

  const params = new URLSearchParams(verificationBody);
  assert.equal(params.get("secret"), "test-secret");
  assert.equal(params.get("response"), "test-token");
  assert.equal(params.has("remoteip"), false);
});

test("Turnstile verification preserves Cloudflare rejection details", async (t) => {
  t.after(restoreEnvironment);
  process.env.TURNSTILE_SECRET_KEY = "test-secret";

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        success: false,
        "error-codes": ["timeout-or-duplicate"],
        hostname: "www.phao.dev",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );

  assert.deepEqual(await verifyTurnstile("expired-token"), {
    success: false,
    errorCodes: ["timeout-or-duplicate"],
    hostname: "www.phao.dev",
  });
});
