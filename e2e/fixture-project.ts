import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

export const isDisposable = (baseURL?: string) => process.env.CI === "true" && baseURL === "https://127.0.0.1:18089";
const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;
function sql(baseURL: string | undefined, statement: string) {
  if (!isDisposable(baseURL)) throw new Error("Project fixtures require the exact disposable CI database.");
  return execFileSync("docker", ["compose", "-p", "portfolio-ci", "-f", "docker-compose.test.yml", "exec", "-T", "db", "psql", "-XAtq", "-v", "ON_ERROR_STOP=1", "-U", "xtomm", "-d", "portfolio"], { input: statement, encoding: "utf8", timeout: 10000 });
}

// Real data is never copied into CI. The known bookmark uses public project number 2.
export function ensureProjectFixture(baseURL?: string): string | null {
  if (!isDisposable(baseURL)) return null;
  const id = `v2-project-${randomUUID()}`;
  return sql(baseURL, `INSERT INTO projects(id,number,title,description,tags,year,status,updated_at) SELECT ${literal(id)},'2','Uma project fixture','Disposable project for V2 navigation checks.',ARRAY['TypeScript'],'2026','LIVE',now() WHERE NOT EXISTS (SELECT 1 FROM projects WHERE number='2') ON CONFLICT (number) DO NOTHING RETURNING id;`).trim() || null;
}
export function removeProjectFixture(baseURL: string | undefined, id: string | null) {
  if (id) sql(baseURL, `DELETE FROM projects WHERE id=${literal(id)};`);
}
