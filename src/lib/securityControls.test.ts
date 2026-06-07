import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { SignJWT } from "jose";
import { assertProductionRuntimeConfiguration } from "../../runtime-config.mjs";
import { detectImageType } from "@/lib/imageValidation";
import {
  isSafeProjectImage,
  transformProjectMarkdownUrl,
  validateProjectCaseStudyInput,
} from "@/lib/projectCaseStudy";
import { rejectCrossSiteMutation } from "@/lib/requestSecurity";
import {
  assertJwtSecretConfiguration,
  SESSION_AUDIENCE,
  SESSION_ISSUER,
  signSessionToken,
  verifySessionToken,
} from "@/lib/sessionToken";

const originalNodeEnv = process.env.NODE_ENV;
const originalJwtSecret = process.env.JWT_SECRET;
const mutableEnvironment = process.env as Record<string, string | undefined>;

function restoreAuthEnvironment() {
  if (originalNodeEnv === undefined) delete mutableEnvironment.NODE_ENV;
  else mutableEnvironment.NODE_ENV = originalNodeEnv;

  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
}

test("production rejects missing, short, and known JWT secrets", (t) => {
  t.after(restoreAuthEnvironment);
  mutableEnvironment.NODE_ENV = "production";

  delete process.env.JWT_SECRET;
  assert.throws(assertJwtSecretConfiguration);

  process.env.JWT_SECRET = "too-short";
  assert.throws(assertJwtSecretConfiguration);

  process.env.JWT_SECRET = "fallback-dev-secret-change-me";
  assert.throws(assertJwtSecretConfiguration);

  process.env.JWT_SECRET = "0123456789abcdef0123456789abcdef";
  assert.doesNotThrow(assertJwtSecretConfiguration);
});

test("production runtime requires a canonical HTTPS site origin", () => {
  const baseEnvironment = {
    NODE_ENV: "production" as const,
    JWT_SECRET: "0123456789abcdef0123456789abcdef",
    DATABASE_URL: "postgresql://user:password@db:5432/portfolio",
    TURNSTILE_SECRET_KEY: "turnstile-secret",
    TURNSTILE_SITE_KEY: "turnstile-site",
  };

  assert.throws(() =>
    assertProductionRuntimeConfiguration(baseEnvironment),
  );
  assert.throws(() =>
    assertProductionRuntimeConfiguration({
      ...baseEnvironment,
      NEXT_PUBLIC_SITE_URL: "http://phao.dev",
    }),
  );
  assert.doesNotThrow(() =>
    assertProductionRuntimeConfiguration({
      ...baseEnvironment,
      NEXT_PUBLIC_SITE_URL: "https://phao.dev",
    }),
  );
});

test("session tokens require the configured issuer, audience, subject, and role", async (t) => {
  t.after(restoreAuthEnvironment);
  mutableEnvironment.NODE_ENV = "production";
  process.env.JWT_SECRET = "0123456789abcdef0123456789abcdef";

  const token = await signSessionToken("user-123", "ADMIN");
  assert.deepEqual(await verifySessionToken(token), {
    userId: "user-123",
    role: "ADMIN",
  });

  const invalidAudience = await new SignJWT({
    userId: "user-123",
    role: "ADMIN",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("user-123")
    .setIssuer(SESSION_ISSUER)
    .setAudience(`${SESSION_AUDIENCE}-invalid`)
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));

  assert.equal(await verifySessionToken(invalidAudience), null);
});

test("mutation origin protection rejects cross-site requests", async () => {
  const crossSite = new Request("https://phao.dev/api/contact", {
    method: "POST",
    headers: {
      Origin: "https://attacker.example",
      "Sec-Fetch-Site": "cross-site",
    },
  });
  const rejected = rejectCrossSiteMutation(crossSite);
  assert.equal(rejected?.status, 403);

  const sameOrigin = new Request("https://phao.dev/api/contact", {
    method: "POST",
    headers: {
      Origin: "https://phao.dev",
      "Sec-Fetch-Site": "same-origin",
    },
  });
  assert.equal(rejectCrossSiteMutation(sameOrigin), null);
});

test("production mutation origin protection trusts only the configured site", (t) => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  t.after(() => {
    restoreAuthEnvironment();
    if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
  });

  mutableEnvironment.NODE_ENV = "production";
  process.env.NEXT_PUBLIC_SITE_URL = "https://phao.dev";

  const spoofedRequestOrigin = new Request(
    "https://attacker.example/api/contact",
    {
      method: "POST",
      headers: {
        Origin: "https://attacker.example",
        "Sec-Fetch-Site": "same-origin",
      },
    },
  );
  assert.equal(rejectCrossSiteMutation(spoofedRequestOrigin)?.status, 403);
});

test("image detection uses file signatures rather than client MIME alone", () => {
  assert.deepEqual(
    detectImageType(
      Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ),
    { mime: "image/png", extension: "png" },
  );
  assert.deepEqual(
    detectImageType(
      Uint8Array.from([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61,
      ]),
    ),
    { mime: "image/gif", extension: "gif" },
  );
  assert.equal(
    detectImageType(new TextEncoder().encode("<svg><script /></svg>")),
    null,
  );
});

test("project case studies reject unsafe URLs and oversized content", () => {
  assert.match(
    validateProjectCaseStudyInput({ demoUrl: "javascript:alert(1)" }) ?? "",
    /http or https/,
  );
  assert.match(
    validateProjectCaseStudyInput({
      writeupMarkdown: "x".repeat(50_001),
    }) ?? "",
    /exceeds/,
  );
  assert.equal(
    validateProjectCaseStudyInput({
      demoUrl: "https://example.com/demo",
      gallery: [
        {
          image: "/uploads/projects/frame.webp",
          title: "Frame",
          caption: "",
          alt: "Frame",
        },
      ],
    }),
    null,
  );
});

test("project media preserves checked-in assets but rejects uploaded SVG", () => {
  assert.equal(isSafeProjectImage("/projects/concept-frame.svg"), true);
  assert.equal(isSafeProjectImage("/projects/case-study/frame.webp"), true);
  assert.equal(isSafeProjectImage("/uploads/projects/frame.webp"), true);
  assert.equal(isSafeProjectImage("/uploads/projects/frame.svg"), false);
  assert.equal(isSafeProjectImage("/projects/../secret.svg"), false);
});

test("project markdown strips active URL schemes", () => {
  assert.equal(
    transformProjectMarkdownUrl("javascript:alert(1)"),
    "",
  );
  assert.equal(
    transformProjectMarkdownUrl("https://example.com/demo"),
    "https://example.com/demo",
  );
  assert.equal(
    transformProjectMarkdownUrl("/uploads/projects/frame.webp"),
    "/uploads/projects/frame.webp",
  );
});

test("all authenticated CMS mutations use the centralized admin guard", () => {
  const routeFiles = [
    "src/app/api/projects/route.ts",
    "src/app/api/projects/[id]/route.ts",
    "src/app/api/settings/route.ts",
    "src/app/api/admin/posts/route.ts",
    "src/app/api/admin/posts/[id]/route.ts",
    "src/app/api/admin/posts/[id]/publish/route.ts",
    "src/app/api/admin/posts/[id]/archive/route.ts",
    "src/app/api/uploads/project-image/route.ts",
    "src/app/api/uploads/post-image/route.ts",
  ];

  for (const routeFile of routeFiles) {
    const source = readFileSync(path.join(process.cwd(), routeFile), "utf8");
    assert.match(
      source,
      /requireAdminMutation/,
      `${routeFile} must use requireAdminMutation`,
    );
  }
});
