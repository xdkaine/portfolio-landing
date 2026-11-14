# Purposeful portfolio design: first DEV slice

14 November 2026. Target: private DEV, based on `5051a54b`. Production promotion is separate. The existing `/v2` experiment, CMS data, authentication policy, database schema, and administrator-managed deployment helpers are outside this patch.

## Result

- Home introduces Thomas persistently alongside the personal aliases, explains the relationship between engineering work and the current Technology Risk Consultant role, and brings selected work forward.
- Three CMS-selected project summaries use existing editorial excerpts and the first gallery image. The screenshot choice follows CMS gallery ordering. Missing images fall back to the readable project entry.
- Slogan marquee, unsupported counters, manifesto, capability inventory, and ornamental location stamp are removed. Location is retained as ordinary profile information.
- Projects uses one responsive, readable row per entry, with meaningful status/year and summaries visible without hover. Fictional permissions and tiny duplicate desktop/mobile markup are removed.
- Source/demo actions appear near the project introduction. Duplicate repository destinations produce one source action, and repository links are not described as live demos.
- Long domain titles fit narrow screens and break at domain boundaries. Native browser context menus are restored.
- Navigation and gallery use native modal dialogs, with Escape, focus containment, opener focus restoration, and scroll restoration. The gallery has explicit zoom/reset controls and keyboard panning. Browser zoom shortcuts remain available.
- Contact's consent links are persistently underlined.

## Regression evidence

Four tests reproduced the original behavior on the running DEV revision before fixes: mobile menu Escape, 483px overflow at a 360px viewport, gallery focus outside the modal, and prevented native context menus. Those scenarios pass against the local implementation. Modified browser zoom shortcuts are covered as well.

Other checks completed during implementation: 98 Node tests, TypeScript, production build, lint (one existing blog Open Graph image warning), and contrast-enabled accessibility scans on six routes in both themes. The existing homepage no-JavaScript, metadata, alias synchronization, and compact-summary checks were retained and adapted to the intentional removal of counters.

Visual baselines now cover the introduction at desktop/mobile sizes in both themes, using reduced motion, loaded fonts, and settled navigation. Linux and Windows baselines were rendered and reviewed. This deterministic introductory comparison is independent of mutable CMS content; the populated project layout is additionally inspected with actual public DEV data and images. Normal CI compares baselines rather than updating them. Existing sign-in comparison remains.

The CI wrapper retains Playwright reports, failure traces, and coverage reports on existing NFS storage under each revision/run, including failed runs. A report-copy failure cannot bypass the existing test-environment cleanup.

Linux-only deployment helper tests and the complete browser suite must also pass through the normal VM pipeline before DEV deployment. After deployment, verify the expected revision and repeat the real page/asset/keyboard checks. A successful build alone is not DEV acceptance.

## Live DEV follow-up

The first release, `755552bf`, completed [DEV CI](https://github.com/xdkaine/portfolio-landing/actions/runs/43640451629): 94 Linux Node tests, 12 deployment-helper tests, and 48 browser checks passed, with one existing skip. Its Playwright report was retained in the release's `checks/43640451629-1` directory and the live health revision matched.

All 12 live accessibility scans passed. Live media inspection found that one selected-work preview transferred a 1,489,330-byte original and took 15 seconds on this route. The existing image optimizer served the same image at 750px as a 12,792-byte WebP. Home now requests responsive optimized previews for local images; full case-study images and external-image support remain available.

One live hydration test timed out while awaiting Contact's title before confirming route completion. A separate normal-motion browser trace confirmed that the click started its request immediately, the Contact URL/heading appeared after about 1.9 seconds, and the correct title settled at 2.1 seconds and remained correct through 20 seconds. The test now waits for the Contact URL and heading before checking its title. Both motion variants passed the focused rerun; no title-code change was indicated. The preview follow-up still needs its own normal CI deployment and final live acceptance.

## Design review

Independent design and interaction reviewers checked the implementation. Their two corrections were applied: prevent a domain suffix becoming a lone oversized letter, and preserve Ctrl/Cmd browser zoom shortcuts. The design reviewer confirmed the domain fix at desktop and mobile widths.

## Remaining editorial work

This first slice does not claim to complete every finding from the audit. Later work includes curating long case-study galleries, choosing the strongest cover images, resolving ambiguous project lifecycle descriptions, completing brief project notes, aligning writing terminology, and refining About/utility/share layouts. These should preserve the stronger existing personal writing and use verified claims.

Use the existing `dev` workflow for acceptance and keep shared CI queue order. Account for dev/main differences before promoting the reviewed patch to production; do not merge the separate v2/CMS histories merely to deliver these presentation changes.
