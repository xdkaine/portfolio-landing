# Portfolio V2 production release preparation

Observed 21 November 2026. The user requested replacing DEV V2 with the reviewed DEV V1 design and promoting that V2 to main. This candidate combines main `ea98728eaeb9977b198824fefe146d5c19a5627c` and DEV `f496939dce991dafda48ad5d1c02b5593631ee14`. Production still serves `f6fc355be24db27a62780e5ed79e0958c6def20f` at the preparation baseline.

## Release contents

- V2 now uses the reviewed portfolio design: project imagery and modular stories, editable About content, simplified authoring, GIF/build footer, directional page entrances, metric/headline animations and reversible scroll reveals. Its components and styles are isolated under V2. Existing studio work/writing bookmarks redirect to the matching current pages.
- Preserve main's existing public V1 design. Root routing remains V1 in this draft, pending the user's requested routing choice. V2 has its own canonical metadata, feed, open-graph images, sitemap entries and read-only API adapters over the shared published CMS catalog.
- Retain production sign-in and central account-link behavior exactly. The unrelated DEV admin approval-session feature, routes and two grant migrations are excluded. Prisma schema and production migrations match main; this release adds no database migration.
- Keep main's analytics preferences and visitor analytics, inbox, activity, explicit optimistic versions, recoverable trash, post revisions, working drafts and canonical no-store editor loader. Modern project/post/About editors use those existing contracts. Private previews render the V2 article without public chrome or scroll reveals.
- About saves use the bounded JSON reader and create an activity event in the same transaction. Project creation serializes automatic numbering. Legacy documents/media/URLs remain supported. The existing public asset and admin URLs stay under V1.
- Preserve main's dependency/tooling versions with the scoped Effect 3.22.1 override. Fonts are the exact bundled DEV assets. No additional framework upgrade is included.

## Production data and configuration

The fresh public baseline contains eight projects and six published posts; DEV has eight projects and two posts. Retain production database, media, settings, identities and runtime Secrets. Do not clone DEV data or run demo/admin seeds against production.

Production uses `ADMIN_AUTH_MODE=oidc` and `OIDC_ACCOUNT_LINK_MODE=idp`. Existing callback URLs and authorization contracts remain unchanged. No test-access feature is included or activated.

## Validation and delivery

Local preparation currently passes TypeScript, lint (two existing/copy image warnings) 98 Windows unit tests, a normal production build, and the dependency gate (zero high/critical, eight existing moderate advisories). Exact-candidate Linux CMS integration, browser, visual, dependency and production build checks remain pending. Existing V1-approved visual baselines are reused for V2 without rewriting them.

Use the normal manually dispatched Local CI/CD workflow on `codex/prepare-portfolio-main`. Manual branches validate and package without deploying. Keep shared CI queue order. Preserve the isolated test DB's main-only loopback port 18090 required by the retained CMS integration gate.

Merging main triggers production deployment. Acceptance requires the exact applied receipt, retained image checksums, pre-migration backup, completed migration job, app readiness, actual public V2 behavior and intended V1/root routing. Compare the full production public catalog before/after. Validate canonical URLs, rendered media, scroll replay, reduced-motion/no-JavaScript reading, analytics opt-out, canonical SSO redirects and anonymous CMS protection. Protocol/guard checks do not establish an actual owner MFA sign-in.

## Recovery and evidence

The preparation baseline production image is `docker.io/library/portfolio-local@sha256:20dd0667eeb82d5c1af9151eb16dce9c923ac23a01a328044b7f90ffd9c53b5a`. Retain its normal release package and the deploy backup under `/var/backups/portfolio-deploy`. Use the established root-owned deployment helper and retained image for application rollback. Do not replace helpers or automatically restore the database.

No schema migration is added. Preserve rich story JSON; an older editor may strip unfamiliar nodes. An application rollback is not a database restore or restore-drill acceptance.

Evidence belongs in the homelab workspace `artifacts/portfolio-main-prep-20261121` and its dated agent-owned BookStack release note. The user's original dirty checkout is untouched. No extra preview server or database was started outside the standard CI stack.
