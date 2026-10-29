# Portfolio v2: first slice

Built 28 October 2026 for the private development environment. The feature branch is `codex/portfolio-v2`, based on `dev` at `92f7a9707721f77ed646608ac76a0487c9a6dcad`.

## Scope and separation

The slice adds an engineering-studio homepage at `/v2`, searchable/filterable project discovery at `/v2/work`, project details at `/v2/work/[slug]`, and an interactive Uma case study. Existing v1 routes, CMS components, Prisma schema, migrations, auth, deployment configuration, and root redirect are unchanged.

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

Both screenshots represent historical interfaces. The architecture and other project illustrations are authored SVG/CSS.

## Verification and delivery

Run `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build`. Run `PLAYWRIGHT_TEST_BASE_URL=<preview-url> npx playwright test e2e/v2.spec.ts --workers=1` against an active preview (use PowerShell environment-variable syntax on Windows).

The focused browser suite checks API contracts, invalid filters, missing records, rejected mutation methods, discovery without JavaScript, scenario changes, keyboard operation, reset, absence of v1 API requests, responsive overflow, and automated WCAG accessibility including contrast at 390px and 1440px. Automated checks do not establish real-device or screen-reader acceptance.

The v2 unit checks live at `src/lib/v2Catalog.test.ts` so the existing Linux shell test glob discovers them. They also run directly with `npx tsx --test src/lib/v2Catalog.test.ts`.

Delivery targets `dev` only through its existing CI pipeline into `dev-portfolio`. Confirm `/v1/api/health` reports the deployed dev commit, then verify `/v2`, its project library, the Uma walkthrough, and the v2 APIs through the private dev hostname. No production promotion is part of this slice.

Rollback is a revert of the v2 commit on `dev` through the same pipeline; there are no v2 migrations or data writes to undo. The v1 CMS work can merge independently because this slice only adds v2-owned source, assets, focused tests, and this document.
