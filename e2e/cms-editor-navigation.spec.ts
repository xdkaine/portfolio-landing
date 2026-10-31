import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import { test, expect } from "@playwright/test";

test("editor reloads the saved draft after preview Back navigation and retries failed loads", async ({
  page,
  context,
  baseURL,
}) => {
  test.skip(
    process.env.CI !== "true" || baseURL !== "http://127.0.0.1:18089",
    "Uses only the disposable CI Compose stack",
  );
  test.setTimeout(60_000);
  const userId = `cms-navigation-${randomUUID()}`;
  const title = `Saved draft ${randomUUID()}`;
  const marker = `saved-body-${randomUUID()}`;
  let postId: string | undefined;
  const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;
  const sql = (query: string) =>
    execFileSync(
      "docker",
      [
        "compose",
        "-p",
        "portfolio-ci",
        "-f",
        "docker-compose.test.yml",
        "exec",
        "-T",
        "db",
        "psql",
        "-XAtq",
        "-v",
        "ON_ERROR_STOP=1",
        "-U",
        "xtomm",
        "-d",
        "portfolio",
      ],
      { input: query, encoding: "utf8", timeout: 10_000 },
    );
  expect(sql("SELECT current_database();").trim()).toBe("portfolio");
  try {
    sql(
      `INSERT INTO users(id,email,password,name,role,updated_at) VALUES (${literal(userId)},${literal(userId + "@example.invalid")},'unused-disposable-fixture','CMS navigation fixture','ADMIN',now());`,
    );
    // This key belongs only to the checked-in disposable Compose test stack.
    // Never read production credentials or mint a production SSO session here.
    const token = await new SignJWT({ userId, role: "ADMIN" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(userId)
      .setIssuer("portfolio-landing")
      .setAudience("portfolio-admin")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(
        new TextEncoder().encode(
          "test-jwt-secret-must-be-at-least-32-chars-long",
        ),
      );
    await context.addCookies([
      {
        name: "xtomm-session",
        value: token,
        url: baseURL!,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    const created = await context.request.post("/v1/api/admin/posts", {
      headers: { Origin: "https://localhost" },
    });
    expect(created.ok()).toBeTruthy();
    const draft = await created.json();
    postId = draft.id;
    expect(typeof postId).toBe("string");
    await page.goto(`/v1/admin/posts/${postId}`);
    await expect(
      page.getByRole("textbox", { name: "TITLE", exact: true }),
    ).toHaveValue("UNTITLED TRANSMISSION");
    // Change the server record after this route's first payload was cached.
    const saved = await context.request.patch(`/v1/api/admin/posts/${postId}`, {
      headers: { Origin: "https://localhost" },
      data: {
        version: draft.version,
        title,
        excerpt: "Saved server draft",
        bodyJson: {
          type: "doc",
          content: [
            { type: "paragraph", content: [{ type: "text", text: marker }] },
          ],
        },
      },
    });
    expect(saved.ok()).toBeTruthy();
    await page
      .getByRole("button", { name: "Preview saved draft", exact: true })
      .click();
    await expect(page.getByText(marker, { exact: true })).toBeVisible();
    await page.goBack();
    await expect(
      page.getByRole("textbox", { name: "TITLE", exact: true }),
    ).toHaveValue(title);
    await expect(page.locator('[contenteditable="true"]')).toContainText(
      marker,
    );

    const apiPath = `**/v1/api/admin/posts/${postId}`;
    await page.route(apiPath, (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Saved post is temporarily unavailable",
        }),
      }),
    );
    await page.reload();
    await expect(page.getByRole("alert")).toContainText(
      "Saved post is temporarily unavailable",
    );
    await expect(
      page.getByRole("textbox", { name: "TITLE", exact: true }),
    ).toHaveCount(0);
    await page.unroute(apiPath);
    await page
      .getByRole("button", { name: "Retry loading post", exact: true })
      .click();
    await expect(
      page.getByRole("textbox", { name: "TITLE", exact: true }),
    ).toHaveValue(title);
  } finally {
    sql(
      `DELETE FROM cms_audit_events WHERE actor=${literal(userId)}; ${postId ? `DELETE FROM posts WHERE id=${literal(postId)};` : ""} DELETE FROM users WHERE id=${literal(userId)};`,
    );
  }
});
