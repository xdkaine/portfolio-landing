# Portfolio main release preparation

Observed 21 November 2026. This candidate integrates DEV `4aa3c4970f1675e801d3ba730a349f75d13b1b3b` with main `ea98728eaeb9977b198824fefe146d5c19a5627c`. Production currently serves `f6fc355be24db27a62780e5ed79e0958c6def20f`.

## Release contents

- V1 stays the default homepage. Bring across the DEV identity, project previews and stories, modular media editor, editable About page, footer GIF/build link, directional page transitions and reversible scroll reveals.
- Keep the separately routed V2 pages. They do not replace V1.
- Preserve main's central account links, client/mapping-version liveness checks, analytics opt-out, visitor analytics, inbox, activity, optimistic versions, recoverable trash, post revisions and working drafts. Integrate the new visual editors with those existing contracts.
- Retain main's current dependency/tooling versions and DEV's scoped Effect override. Fonts remain the exact bundled DEV assets. The audit currently reports zero high/critical and eight existing moderate dependency findings. Next.js remains 16.4.2; no additional framework upgrade is included.
- About saves use the CMS bounded JSON reader and create an activity event in the same transaction. Project creation keeps DEV's serialized automatic numbering. Existing project URLs remain intact.

## Production data and configuration

The fresh public baseline contains eight projects and six published posts. DEV contains eight projects and two published posts. This is a code release: retain production data, media, settings, identities and runtime Secrets. Do not copy the DEV database or run demo/admin seeds against production.

Production uses `ADMIN_AUTH_MODE=oidc` and `OIDC_ACCOUNT_LINK_MODE=idp`; the candidate preserves that owner sign-in path. Both approval-session activation flags are absent in production. The new approval-session code remains disabled by default; this release does not activate it.

The two added migrations only create `test_access_grants` and add its legacy-safe scope column. Main's existing CMS/visitor migrations and schema models are retained. No destructive schema operation or content migration is planned.

## Gates and delivery

Validate the exact candidate through the normal manually dispatched Local CI/CD workflow on `codex/prepare-portfolio-main`. Manual branches run source, unit, CMS database integration, dependency, Linux build and browser checks, then package images; they do not submit a deployment. Preserve shared queue order.

Local preparation passes TypeScript, lint (one existing image warning), 124 unit tests and the high-severity audit gate. A normal production build completed after the existing Next.js upgrade reminder and its documented identical retry. Full exact-commit Linux/CMS/browser validation remains required. Existing public visual baselines must pass; do not accept new baselines just to hide a merge regression.

Merging to main automatically starts production CI/deployment. After the release decision, verify the exact main revision, retained-image checksums, target database backup, completed migration job, app readiness and `/var/lib/k3s-local-ci/portfolio-main.json` applied receipt. Check public rendering, images, counts, blog/project reading, reduced motion and replay on the real production hostname. Check canonical SSO redirects and anonymous CMS protection; distinguish protocol tests from an actual owner MFA sign-in.

## Recovery

The current production app digest is `sha256:20dd0667eeb82d5c1af9151eb16dce9c923ac23a01a328044b7f90ffd9c53b5a`. Retain its normal release package and the deployment's database backup under `/var/backups/portfolio-deploy`. Use the established root-owned deployment helper and previous image for application rollback. Do not replace helpers or restore a database automatically.

The added grant table can remain when rolling the application back. New rich story JSON must be preserved; older editors may strip unfamiliar media nodes, so avoid editing those documents through an older editor. An application rollback is not a database restore or restore-drill acceptance.

Public baseline, safe runtime-configuration inventory and final validation evidence belong in `artifacts/portfolio-main-prep-20261121` in the homelab workspace and its dated BookStack release note. Credentials and private content do not belong in release artifacts.
