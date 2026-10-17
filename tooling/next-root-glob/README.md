# Next ESLint root-directory adapter

This private package replaces only `@next/eslint-plugin-next`'s `fast-glob`
dependency. It implements the named `globSync(pattern, { onlyDirectories: true })`
call used by Next 16.4.2's `getRootDirs`, using canonical `tinyglobby` instead of
the unpatched `braces` dependency. It is not a general fast-glob replacement.

Literal directories must not expand to descendants, absolute roots must stay
absolute, and directory matches must not gain trailing separators. The actual
Next helper and its internal-link lint rule are covered in
`src/lib/nextLintRoots.test.ts`. Recheck that caller contract when upgrading Next.

The root `.npmrc` packs local file dependencies (`install-links=true`) so this
package survives Docker stages that copy only `node_modules`.
