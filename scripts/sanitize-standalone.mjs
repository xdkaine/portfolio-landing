import { readdir, rm } from "node:fs/promises";
import path from "node:path";

const workspaceRoot = path.resolve(".");
const standaloneRoot = path.resolve(".next", "standalone");

if (!standaloneRoot.startsWith(`${workspaceRoot}${path.sep}`)) {
  throw new Error(`Refusing to sanitize outside the workspace: ${standaloneRoot}`);
}

const forbiddenEntries = [
  ".env",
  ".env.local",
  ".env.production",
  "compose.runner.yml",
  "docker-compose.dev.yml",
  "docker-compose.yml",
  "docs",
  "nginx",
  "skills-lock.json",
  "src",
];

await Promise.all(
  forbiddenEntries.map((entry) =>
    rm(path.join(standaloneRoot, entry), { recursive: true, force: true }),
  ),
);

const remainingEntries = await readdir(standaloneRoot);
const leakedEntry = remainingEntries.find(
  (entry) =>
    forbiddenEntries.includes(entry) ||
    entry === ".env" ||
    entry.startsWith(".env."),
);

if (leakedEntry) {
  throw new Error(
    `Standalone output contains forbidden release entry: ${leakedEntry}`,
  );
}
