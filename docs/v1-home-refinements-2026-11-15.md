# V1 homepage refinements

15 November 2026 (Pacific). The owner selected the private DEV `/v1` design as the direction for further portfolio work. This change targets `dev`, starting from `8b065a93396033d9106c65854239b0c9682d795f`; production promotion is outside this change.

## Requested presentation

- Remove the introductory name/location strip.
- Cycle Thomas Phao, Tommy and Kaine together in the heading and introduction, preserving synchronization with navigation, footer and browser title. Render the full name before hydration and when motion is reduced.
- Use “builder and developer” and “share my experiences” in the introduction, link the current role to the configured LinkedIn URL, rename Selected Work to Projects, and use the owner's revised personal note.
- Replace the navigation's Index label with an accessible Home icon.
- Use flat black in V1 dark mode and remove the grain overlay. Keep the light theme and native browser context menus.
- Replace the footer copyright/update line with a link derived from the actual deployed `APP_REVISION`. Keep Privacy and Terms available.

Implementation: [PR #69](https://github.com/xdkaine/portfolio-landing/pull/69). Development review URL: <https://portfolio-dev.devops.home.phao.dev/v1>.

## Validation and delivery

TypeScript and focused ESLint passed. All 22 VM browser checks passed without retries, including exact synchronization through the three-name cycle, server-rendered content, reduced motion, keyboard navigation and image inspection. Five Linux and five Windows visual checks passed, and the intentional baselines were inspected in both themes at desktop/mobile sizes. Ten additional viewport/theme checks passed at 320, 390, 768, 1024 and 1440px without horizontal overflow or name overlap. A focused check of the real animation components also passed 250 synchronized samples over complete name cycles.

The animation uses one shared external store and timer per alias/timing sequence. Independent component timers could differ by a character at a boundary; all consumers now read the same frame. The timer stops when its last subscriber leaves, and reduced motion uses a stable full-name snapshot.

Dated release results, live revision/commit-link verification, remaining acceptance gaps and recovery references are maintained in the [knowledge base record](https://docs.home.phao.dev/books/agent-knowledge/page/portfolio-v1-homepage-refinements-15-november-2026). Normal DEV CI and live deployed acceptance follow this source checkpoint through PR #69.

The isolated preflight uses the existing runner dependencies only after comparing parsed lockfiles for exact equality. Its source archive is normalized to Linux line endings to reuse unchanged Docker layers. The normal CI install, audit, unit/helper/browser checks and deployment gates remain intact.

Local execution evidence is under `artifacts/portfolio-v1-home-20261115/` in the homelab workspace. VM evidence is under `/srv/ci-artifacts/portfolio/home-refinements-20261115/`.

## Recovery

There are no CMS writes, schema edits or new migrations. Revert PR #69 on `dev` through the existing pipeline if necessary. The prior applied revision and image digests are retained in `artifacts/portfolio-v1-home-20261115/dev-before.json`; this does not authorize restoring an old database over newer writes. Existing deployment helpers retain backup, migration, readiness and revision checks.
