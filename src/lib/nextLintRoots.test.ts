import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, lstatSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { Linter } from "eslint";

const require = createRequire(path.join(process.cwd(), "package.json"));
const { getRootDirs } = require("@next/eslint-plugin-next/dist/utils/get-root-dirs") as {
  getRootDirs(context: { cwd: string; settings: { next?: { rootDir?: unknown } } }): string[];
};
const nextPlugin = require("@next/eslint-plugin-next") as import("eslint").ESLint.Plugin;
const forward = (value: string) => value.replace(/\\/g, "/");

function withRoots(check: (fixture: string) => void) {
  const fixture = mkdtempSync(path.join(process.cwd(), "lint-fixture-"));
  try {
    for (const app of ["shop", "blog"]) {
      mkdirSync(path.join(fixture, app, "pages"), { recursive: true });
      writeFileSync(path.join(fixture, app, "pages", "about.tsx"), "export default function About() { return null; }");
    }
    check(fixture);
  } finally {
    assert.equal(path.dirname(fixture), process.cwd());
    rmSync(fixture, { recursive: true, force: true });
  }
}

test("Next lint discovers only the requested roots for literal, glob, brace and array settings", () => {
  withRoots((fixture) => {
    const relative = path.basename(fixture);
    const roots = (rootDir: unknown) => getRootDirs({ cwd: process.cwd(), settings: { next: { rootDir } } }).sort();
    assert.deepEqual(getRootDirs({ cwd: process.cwd(), settings: {} }), [process.cwd()]);
    assert.deepEqual(roots("."), ["."]);
    assert.deepEqual(roots(process.cwd()), [forward(process.cwd())]);
    assert.deepEqual(roots(forward(process.cwd()) + "/"), [forward(process.cwd())]);
    assert.deepEqual(roots(`${relative}/shop`), [`${relative}/shop`]);
    assert.deepEqual(roots(`${relative}/*`), [`${relative}/blog`, `${relative}/shop`]);
    assert.deepEqual(roots(`${relative}/{blog,shop}`), [`${relative}/blog`, `${relative}/shop`]);
    assert.deepEqual(roots([`${relative}/shop`, `${relative}/blog`, null]), [`${relative}/blog`, `${relative}/shop`]);
    assert.deepEqual(roots(path.join(fixture, "shop")), [forward(path.join(fixture, "shop"))]);
    assert.deepEqual(roots(forward(fixture).replace(/\//g, "\\") + "\\shop"), [forward(path.join(fixture, "shop"))]);
    assert.deepEqual(roots(`${relative}/missing`), []);
  });
});

test("Next internal-link rule still rejects internal anchors and permits external and download links", () => {
  withRoots((fixture) => {
    const linter = new Linter();
    const verify = (attributes: string, rootDir = forward(fixture) + "/*") => linter.verify(`export default () => <a ${attributes}>About</a>;`, [{
      files: ["**/*.jsx"],
      languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
      plugins: { next: nextPlugin },
      settings: { next: { rootDir } },
      rules: { "next/no-html-link-for-pages": "error" },
    }], { filename: "example.jsx" });
    const internal = verify('href="/about/"');
    assert.equal(internal.length, 1);
    assert.equal(internal[0].ruleId, "next/no-html-link-for-pages");
    assert.deepEqual(verify('href="https://example.com/about/"'), []);
    assert.deepEqual(verify('href="/about/" download'), []);
    const originalCwd = process.cwd();
    try {
      process.chdir(path.join(fixture, "shop"));
      const cwdInternal = verify('href="/about/"', process.cwd());
      assert.equal(cwdInternal.length, 1);
      assert.equal(cwdInternal[0].ruleId, "next/no-html-link-for-pages");
    } finally {
      process.chdir(originalCwd);
    }
  });
});

test("lint adapter is packed for Docker and the unpatched glob implementation is absent", () => {
  const pluginRequire = createRequire(require.resolve("@next/eslint-plugin-next"));
  const adapterPath = pluginRequire.resolve("fast-glob/package.json");
  const adapter = JSON.parse(readFileSync(adapterPath, "utf8"));
  assert.equal(adapter.name, "@portfolio/next-root-glob");
  assert.equal(lstatSync(path.dirname(adapterPath)).isSymbolicLink(), false);
  const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
  for (const entry of Object.keys(lock.packages)) {
    assert.doesNotMatch(entry, /node_modules\/(braces|micromatch)$/);
  }
});
