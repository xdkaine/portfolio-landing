# Portfolio V2

Updated 21 November 2026. V2 uses the reviewed DEV V1 design from revision 4aa3c497: the same typography, theme, project previews, modular stories, synchronized aliases, footer GIF/build link, directional page entrances, scroll-controlled numbers and headline, and reversible content reveals.

## Routes and content

Public pages are /v2, /v2/projects, /v2/projects/[id], /v2/blog, /v2/blog/[slug], /v2/about, /v2/contact, /v2/privacy and /v2/terms. Project and blog pages read the same published CMS source as V1, including the editable About document. The previous curated studio catalog and illustrative walkthrough have been replaced. Existing media assets remain available.

Components live under src/components/v2. V2 metadata and transition routing are in src/lib/v2. V2 styles are scoped under data-portfolio-v2; document theme rules apply only while that version is mounted, and animation names are prefixed with v2-. Loading the stylesheet must preserve V1's computed styles.

The root redirect is controlled separately by src/app/page.tsx. This DEV change preserves the existing V1 prototype and its current root redirect. Production release routing is reviewed separately.

## Shared authoring and read-only APIs

The established /v1/admin CMS, /v1/api authentication and mutation routes, account bindings, and upload routes remain the authoring boundary. V2 creates no new CMS permissions, storage or migration. Public V2 navigation stays in V2, with the shared Admin destination as an explicit exception.

GET /v2/api/projects and /v2/api/posts return versioned public lists; detail endpoints accept the CMS project number or published post slug. GET /v2/api/home returns current counts and public content, and GET /v2/api/about returns the public profile. Responses use the existing version/data envelope, no-store and noindex. These new API routes expose GET only. Draft and archived posts remain unavailable publicly.

Old /v2/work and /v2/writing bookmarks redirect to Projects and Blog. Known studio project slugs map to the existing CMS numbers; old writing slugs retain their blog destinations. The old mixed-library and illustrative-walkthrough APIs are retired.

## Verification

The established visual, animation, responsive and accessibility checks now target V2. They continue to use the reviewed V1 introduction/About screenshot baselines. Additional checks cover versioned navigation/canonical metadata, source-backed counts, read-only APIs, public-post visibility, no-JavaScript reading, bookmark redirects and V1 stylesheet isolation. Mutation fixtures remain restricted to the disposable CI database; live acceptance uses read-only checks.

Use the normal DEV pipeline and matching deployment receipt before claiming the version is deployed. A main merge and production rollout are separate from this DEV implementation. Preserve production's existing data, media and account configuration when preparing that release.
