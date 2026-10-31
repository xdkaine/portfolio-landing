# Portfolio v2: first slice

Built 28 October 2026 for the private development environment. The feature branch is `codex/portfolio-v2`, based on `dev` at `92f7a9707721f77ed646608ac76a0487c9a6dcad`.

## Scope and separation

The slice adds a personal engineering homepage at `/v2`, searchable/filterable project discovery at `/v2/work`, project details at `/v2/work/[slug]`, and an interactive Uma case study. Existing v1 routes, CMS components, Prisma schema, migrations, auth, deployment configuration, and root redirect are unchanged.

V2 content is independently curated in `src/lib/v2/catalog.ts` from the owner's published portfolio. It is a source-controlled first slice, not a new CMS integration or an automatic mirror of v1. This deliberately avoids coupling to the concurrent CMS work. A future content adapter can replace the v2 catalog behind the same contracts.

Pages and API handlers call the same v2 services. The project library uses a GET form and server rendering so search, filters, deep links, and browser history work without JavaScript. The interactive walkthrough uses local React state; it does not call v1 endpoints or infrastructure services. V2 styles are scoped beneath `.v2`, and v2 navigation stays within v2 except for explicit external profile, source, and email links.

## Read-only API

| Route                                                              | Response                                                              |
| ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `GET /v2/api/home`                                                 | Introduction, selected projects, project count                        |
| `GET /v2/api/projects?q=LDAP&discipline=Identity%20%26%20security` | Filtered items, total, available disciplines, normalized query        |
| `GET /v2/api/projects/uma`                                         | Project detail                                                        |
| `GET /v2/api/projects/uma/walkthrough`                             | Illustrated walkthrough description and supported personas/operations |

Responses use `{ version: "v2", data: ... }`. Invalid filters or a search longer than 120 characters return HTTP 400 with `{ version: "v2", error: { code, message } }`. Unknown detail/walkthrough slugs return HTTP 404. Mutation methods are unimplemented and return HTTP 405. Responses specify `Cache-Control: no-store` and `X-Robots-Tag: noindex`; the v2 page layout also declares noindex. Indexing preferences do not replace the existing private-dev network controls.

## Walkthrough boundaries

Uma's published case study describes LDAP, sessions, app access controls, assigned pools, the Proxmox API, secure VNC proxying, a custom Node server, Socket.IO, and audit views. The walkthrough illustrates these layers. Its member/administrator and console/access-policy scenarios are educational models, not verified reproductions of the real permission engine, exact request ordering, transports, or event schemas. This distinction is visible in the experience. Existing article text describes the architecture even with JavaScript disabled.

Project state describes the portfolio artifact, not a current service-health check. No performance, uptime, user-count, or business-impact metrics have been invented. TBD-DEV is marked in development based on the published narrative rather than its older LIVE catalog flag.

## Content and assets

Content was curated from `https://phao.dev/v1/api/projects`, `https://phao.dev/v1/api/projects/2`, and the public profile settings on 28 October 2026. Original long-form content remains in v1. The public owner-provided Uma screenshots are copied into v2-owned assets so v2 does not depend on a v1 upload route:

| Asset                         | Published source                                                              |
| ----------------------------- | ----------------------------------------------------------------------------- |
| `public/v2/uma-workspace.png` | `/v1/uploads/projects/1774088702975-131d854e-7bd4-4257-ac1d-cd81f7404c7e.png` |
| `public/v2/uma-overview.png`  | `/v1/uploads/projects/1774088714618-bdc95346-c095-4929-acc8-675595e9eaeb.png` |
| `public/v2/uar-dashboard.png` | `/v1/uploads/projects/1774087738079-9501d039-8737-467c-86c1-d9c265c92957.png` |
| `public/v2/uar-request.png` | `/v1/uploads/projects/1774087782878-a67967df-2d40-44c6-b080-69e23b0b2487.png` |

All screenshots represent historical interfaces. The 30 October design reset removed the decorative SVG/CSS project illustrations.

## Design reset, 30 October 2026

The owner rejected the first visual treatment as generic AI output and selected a personal engineer's site: direct, spare, real project screens. Three independent agent reviews covered visual direction, content authenticity, and interaction/accessibility. `DESIGN.md` records the selected direction and its scope, type, tokens, composition, and review criteria.

The opening now pairs Thomas's name and a short introduction with Uma's actual interface. UAR has its own evidence spread, public source link, and account-lifecycle write-up. The remaining projects use a compact index and clearly labelled project notes. Catalog fields for `context`, `writeup`, `decisions`, and `evidence` are additive; existing API envelopes, query handling, slugs, and required fields remain available. Project-specific metadata uses that project's image, or no image when evidence is absent.

The rewrite restores published implementation details, including UAR's non-production AD clone, its review/provisioning workflow, TBD-DEV's OCI-to-LXC runtime, and ROG Tools' shared edge authentication. No outcome metrics or current service-health claims were added.

The Uma explorer explains a specific console request and the contrasting access-policy path. Full-size screenshot links allow inspection of dense interfaces. Browser coverage includes the complete paths, no-JavaScript discovery and trace, UAR evidence/metadata, and accessibility/overflow at 320, 390, and 1440 pixels. The 31 October review below supersedes this first explorer's six-stage model.

## Work and writing, 31 October 2026

A second live review covered visual specificity, source accuracy, and the reading experience. The homepage now opens on Uma's actual cluster overview, with a separate UAR account-request spread. Original-resolution evidence links preserve readable controls. UAR's complete request form sits beside the account-matching and email-verification chapters. Small experiments have short notes rather than a padded case-study template. Uma and UAR link to pinned source lines; no results, adoption numbers, or service-health claims are invented.

The console explanation now has four source-backed stages: session and CSRF, VM/pool permission checks, VNC ticket creation with its audit event, and the WebSocket/TLS proxy. The permission description includes the existing pool-management fallback. A separate two-stage access-policy example illustrates the administrator boundary; it does not invent a write or audit sequence. Selected content precedes the compact stage chooser. All four console stages remain readable without JavaScript.

### Publishing and discovery

Keep publishing through the existing CMS in the target environment. Publishing once makes the article available to `/v2/writing/[slug]`, the homepage writing list, and `/v2/work`; there is no second editor or content copy. Development and production retain their separate content stores and release paths. This change does not migrate or synchronize posts between them.

`src/lib/v2/writingServer.ts` is the single read-only integration boundary around `listPublishedPosts` and `getPublishedPostBySlug`. V2 explicitly maps a public DTO rather than exposing editorial records. Drafts, archived/deleted records, and authoring fields stay out of the response. Structured bodies use the existing normalizer and renderer; legacy Markdown receives safe link/media handling. Existing published media storage remains `/v1/uploads/posts/...`. No v1 CMS source, schema, migration, auth, or publication workflow changes are included.

Projects and articles share the library's GET search, discipline, and kind filters, grouped under Projects and Writing. They do not share a fabricated chronology. Relationships are curated in `writing.ts`: the SDC article links to SDC Cloud, describing the author's isolated nested lab inside the institutional SDC. It is not evidence that Thomas owns the institution, nor deployment proof for Uma/UAR. The homelab article stands independently. New published articles appear automatically; adding a related-project link is a small explicit catalog edit when the connection is supported by the article.

Native article pages provide a reading measure, real publication dates, authored media, heading anchors, and responsive contents navigation. Empty publication lists and unavailable content sources have distinct messages. Source failures do not silently become empty libraries; projects remain accessible when writing is unavailable.

| Additional route | Response |
| --- | --- |
| `GET /v2/api/library?q=SDC&kind=all` | Grouped projects and published writing, available kinds/disciplines, normalized query, total |
| `GET /v2/api/writing` | Published writing summaries |
| `GET /v2/api/writing/[slug]` | Public article with normalized body and curated project links |

These use the existing v2 envelope, no-store/noindex headers, 400 for invalid queries, 404 for missing articles, and 405 for unsupported mutations. An unavailable published reader returns 503 `CONTENT_UNAVAILABLE`. Projects-only library requests do not need the CMS reader.

### Review and verification limits

Focused unit coverage checks public field selection, non-public states, safe media/body normalization, source failure versus empty data, query validation, and grouped filtering. Browser checks cover the real published articles, no-JavaScript reading and discovery, native contents anchors, related links, responsive overflow, and axe at 320, 390, and 1440 pixels. A disposable-CI-only fixture verifies publication-state visibility and unpublishing; it is guarded by both `CI` and the exact local CI base URL, uses the CI Compose database, and never writes to development or production content.

Known baseline limitation: with JavaScript disabled, a missing nested route returns HTTP 404 but its custom error UI is blank. This was reproduced on a production build for existing `/v1/blog`, `/v2/work`, and new `/v2/writing` routes. Published pages work without JavaScript and the custom 404 works with JavaScript. The isolated expected-gap browser test retains its assertions. This release does not broaden into a framework upgrade or shared v1 layout changes to address that issue.

This release targets `dev` only. Verify the deployed revision through `/v1/api/health`, both dev hostname roots redirecting to `/v2`, the library, native articles/media, and the project/article relationship. Rollback is a dev commit revert through the existing pipeline; there are no new database writes or migrations to undo.

## Verification and delivery

Run `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build`. Run `PLAYWRIGHT_TEST_BASE_URL=<preview-url> npx playwright test e2e/v2.spec.ts --workers=1` against an active preview (use PowerShell environment-variable syntax on Windows).

The focused browser suite checks API contracts, invalid filters, missing records, rejected mutation methods, discovery without JavaScript, scenario changes, keyboard operation, reset, absence of v1 API requests, UAR-specific evidence and metadata, responsive overflow, and automated WCAG accessibility including contrast at 320px, 390px, and 1440px. Automated checks do not establish real-device or screen-reader acceptance.

The v2 unit checks live at `src/lib/v2Catalog.test.ts` so the existing Linux shell test glob discovers them. They also run directly with `npx tsx --test src/lib/v2Catalog.test.ts`.

Delivery targets `dev` only through its existing CI pipeline into `dev-portfolio`. Confirm `/v1/api/health` reports the deployed dev commit, then verify `/v2`, its project library, the Uma walkthrough, and the v2 APIs through the private dev hostname. No production promotion is part of this slice.

Rollback is a revert of the v2 commit on `dev` through the same pipeline; there are no v2 migrations or data writes to undo. The v1 CMS work can merge independently because this slice only adds v2-owned source, assets, focused tests, and this document.
