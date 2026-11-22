// Node-only integration tests may import Next server modules without bundling them.
// The guard is active only for an explicitly selected disposable loopback database.
import { registerHooks } from "node:module";
const url = new URL(
  process.env.CMS_TEST_DATABASE_URL ?? "postgresql://invalid/disabled",
);
if (
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  !/^\/cms_(qa|test)(?:_\w+)?$/.test(url.pathname)
) {
  throw new Error(
    "CMS_TEST_DATABASE_URL must select an isolated cms_qa or cms_test database on loopback.",
  );
}
process.env.DATABASE_URL = url.toString();
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only")
      return {
        url: new URL("./cms-server-only-stub.cjs", import.meta.url).href,
        shortCircuit: true,
      };
    return nextResolve(specifier, context);
  },
});
