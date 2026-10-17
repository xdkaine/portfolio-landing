import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";

test("sitemap reflects live published content and removes unpublished URLs", async ({ request, baseURL }) => {
  test.skip(process.env.CI !== "true" || baseURL !== "http://127.0.0.1:18089", "Uses only the local CI Compose test stack");
  test.setTimeout(60000);
  // Use the named disposable Compose database, never an environment DATABASE_URL.
  function sql(query: string) {
    return execFileSync("docker", ["compose", "-p", "portfolio-ci", "-f", "docker-compose.test.yml", "exec", "-T", "db", "psql", "-XAtq", "-v", "ON_ERROR_STOP=1", "-U", "xtomm", "-d", "portfolio"], { input: query, encoding: "utf8", timeout: 10000 });
  }
  const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;
  const id = randomUUID();
  const project = `sitemap-project-${id}`;
  const published = `sitemap-published-${id}`;
  const draft = `sitemap-draft-${id}`;
  const archived = `sitemap-archived-${id}`;
  const projectPath = `/v1/projects/${project}`;
  const postPath = `/v1/blog/${published}`;
  async function urls() {
    const response = await request.get("/sitemap.xml");
    expect(response.ok()).toBeTruthy();
    expect(response.headers()["content-type"]).toContain("application/xml");
    return [...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(match[1]).pathname);
  }
  expect(sql("SELECT current_database();").trim()).toBe("portfolio");
  try {
    // Prime the route before fixture creation to catch a cached build-time fallback.
    expect(await urls()).not.toContain(projectPath);
    const posts = [[published, "PUBLISHED"], [draft, "DRAFT"], [archived, "ARCHIVED"]]
      .map(([slug, status]) => `(${literal(slug)},${literal(slug)},'Sitemap fixture','Disposable CI fixture','2026.10.17','1 MIN',ARRAY[]::text[],true,${literal(status)}::"PostStatus",now())`).join(",");
    sql(`BEGIN;
      INSERT INTO projects(id,number,title,description,tags,year,updated_at) VALUES(${literal(project)},${literal(project)},'Sitemap fixture','Disposable CI fixture',ARRAY[]::text[],'2026',now());
      INSERT INTO posts(id,slug,title,excerpt,date,read_time,tags,published,status,updated_at) VALUES ${posts};
      COMMIT;`);
    const current = await urls();
    expect(current).toContain(projectPath);
    expect(current).toContain(postPath);
    expect(current).not.toContain(`/v1/blog/${draft}`);
    expect(current).not.toContain(`/v1/blog/${archived}`);

    sql(`UPDATE posts SET published=false WHERE id=${literal(published)}; DELETE FROM projects WHERE id=${literal(project)};`);
    const updated = await urls();
    expect(updated).not.toContain(projectPath);
    expect(updated).not.toContain(postPath);
  } finally {
    sql(`DELETE FROM posts WHERE id IN (${[published, draft, archived].map(literal).join(",")}); DELETE FROM projects WHERE id=${literal(project)};`);
  }
});
