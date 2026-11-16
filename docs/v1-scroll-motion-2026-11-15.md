# V1 identity restoration and scroll motion

The owner rejected PR #70's centered About redesign because it diverged from the remaining V1 pages. This change restores the earlier terminal profile, left-aligned heading, biography and tech tree from `5fddfd83240d8636ef7e3ecbe553549ceb3c25fa`. The approved personal-note wording remains shared with Home. Tommy → Kaine, the normal cursor and the footer Build credit remain in place.

## Motion

Blog's distinctive entrance uses a masked headline, sliding rows and drawing rules. Its native route fade was already shared across public V1 pages. Home, Projects and public article headings now use the same entrance vocabulary. Existing About, Contact, project-detail and policy reveals use the shared implementation too. Private article previews disable the entrance.

First-screen elements enter on document loading and route mounting, using Blog's existing 720ms headline / 560ms block timing and short stagger. CSS provides that entrance before hydration; content remains readable without JavaScript. Scrolling interrupts the entrance instead of leaving queued effects running.

Below-screen elements use Motion values tied directly to their position from 94% to 62% of viewport height. There is no spring or timed transition on that progress: slower scrolling reveals gradually, stopping holds the reveal, and a large scroll advances it immediately. Measurement uses an untransformed outer element to avoid feedback from the animated content. Completed reveals remain visible when scrolling back. Reaching the document bottom completes any remaining reveal; keyboard focus makes its content immediately readable. Reduced motion shows all content without transforms, masks or animation delays.

Native scroll behavior and the existing route/shared-element transitions remain intact. No dependencies, content schema or deployment helpers change.

## Verification and release

New browser checks cover partial scroll progress, pause, fast completion, readability on return, shared initial entrances, reduced motion, no-JavaScript reading and keyboard focus. The initial scroll-progress check was confirmed to fail against the preceding DEV release, which displayed the target at full opacity regardless of scroll position. About baselines are refreshed for the restored design; Home's settled visual layout remains covered by its existing baselines.

Implementation: [PR #71](https://github.com/xdkaine/portfolio-landing/pull/71). All 26 focused VM browser checks and four Windows About visual checks passed without retries; TypeScript and focused lint passed. The release follows the normal private DEV pipeline and deployed revision checks. Dated implementation, CI, live verification and recovery evidence is recorded in the [Infrastructure Reference release record](https://docs.home.phao.dev/books/agent-knowledge/page/portfolio-v1-about-restoration-and-scroll-reveals-16-november-2026). Owner visual acceptance remains separate from automated checks.

## Recovery

The preceding DEV release is `e9e544727adbb3179674891b649d64ce94f1f83d`. Revert this change through the established DEV pipeline to recover it. No database restoration is required for the source change; existing backup, migration, readiness and revision gates remain intact. Temporary previews use a disposable database and have no recurring timer.
