# V1 About and navigation refinements

Private DEV implementation dated 15 November 2026 (America/Los_Angeles). Public production is outside this release.

## Owner direction

- Animate Tommy → Kaine together throughout V1. Thomas Phao remains the static personal identity and metadata.
- Improve page transitions and remove the crosshair cursor.
- Place `* Build <revision>` beside the footer's existing image/caffeine credit, linking to the actual deployed commit.
- Rework About to use the available width and remove the narrow, left-heavy terminal presentation.

## Design and behavior

About now has a centered introduction, two balanced background columns, two real application screenshots, and a direct contact action. Its biography renders on the server without waiting for scroll reveals. The images show Uma and UAR and link to their case studies. The page uses existing facts, assets, fonts and colors; the old availability decoration, experience counter and terminal/tree inventory are removed.

V1 navigation uses a short content fade with 10px arrival motion. Each public page owns its transition boundary, so the router controls page mounting while the shell persists. The browser's root crossfade is suppressed, and unrelated content updates do not replay a page entrance. Existing project/post shared-element transitions are preserved. Native Link navigation and browser fallback remain intact; reduced motion disables the animation, and the transition overlay passes pointer input through.

One shared alias store keeps heading, introduction, navigation, footer and browser title synchronized. The visible sequence begins with Tommy and continues to Kaine. The normal browser cursor replaces the crosshair. The footer only displays Build when APP_REVISION is a full valid commit SHA.

## Validation

Focused browser checks cover About without JavaScript, responsive columns/images, overflow, the cursor, actual native transition animation timing, an anchored navigation bar, rapid navigation, history, reduced motion and absent transition API support. Homepage checks cover the two aliases, synchronized names/title and destination metadata. Dark/light About visual baselines are added alongside refreshed Home baselines.

Implementation: [PR #70](https://github.com/xdkaine/portfolio-landing/pull/70), targeting `dev`. Release evidence, deployed revision and remaining acceptance limits are recorded in the [dated Infrastructure Reference knowledge page](https://docs.home.phao.dev/books/agent-knowledge/page/portfolio-v1-about-and-transitions-15-november-2026) after the normal DEV pipeline and live verification finish.

## Recovery and boundaries

The prior DEV revision is `5fddfd83240d8636ef7e3ecbe553549ceb3c25fa` (PR #69). Revert this change through the normal DEV pipeline to recover its source behavior. No CMS writes, schema changes, migrations, deployment-helper changes or production promotion are included. Existing migration, backup, image rollback, readiness and revision gates remain in place. Temporary preview jobs have no timer or recurring schedule.

Owner visual acceptance, physical-device and screen-reader checks remain separate from automated browser verification. No real contact messages are sent by live acceptance checks.
