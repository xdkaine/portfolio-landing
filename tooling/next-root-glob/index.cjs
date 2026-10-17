/* eslint-disable @typescript-eslint/no-require-imports -- Next loads this CommonJS adapter with require. */
const path = require("node:path");
const { globSync: tinyGlobSync } = require("tinyglobby");

// Only the named globSync contract used by Next's getRootDirs is supported.
exports.globSync = function globSync(pattern, options = {}) {
  const absolute = path.isAbsolute(pattern);
  // tinyglobby otherwise turns an absolute cwd into an empty pattern.
  const globPattern = absolute && path.relative(process.cwd(), pattern) === "" ? "." : pattern;
  return tinyGlobSync(globPattern, {
    ...options,
    expandDirectories: false,
    absolute,
  }).map((entry) => {
    const root = path.parse(entry).root;
    return entry.length > root.length ? entry.replace(/[/\\]+$/, "") : entry;
  });
};
