# CMS operations

Evidence date: 28 October 2026 (Pacific). This release replaces the `/v1/admin` dashboard with a responsive content workspace. Production promotion must use the existing K3s release process and its database backup and migration gates.

## Analytics

The public tracker records page loads, clicks and accepted contact submissions into atomic PostgreSQL daily counters. The admin report offers 7, 30 and 90 UTC days, an equal preceding comparison period, a daily data table, CSV export, and rankings for pages, destinations, referrer hosts and broad device categories. Today is partial. These aggregate totals count events. The separate audience report shows browser profiles, tab sessions, visible-page time, engagement, contact conversion, page coverage, countries, browser/OS families, tagged campaigns, landing/exit pages and full-navigation timing. Detailed coverage never exceeds 30 days, even in a 90-day aggregate report. Client events can be blocked or spoofed.

The Visitors view searches observed IP, browser ID, fingerprint, browser/OS and country, with 20 profiles per page and a five-minute activity filter that refreshes every 15 seconds while visible. A profile shows its latest 20 retained sessions and latest 60 non-engagement journey events per session. Engagement contributes to session totals. IDs identify browser storage, not verified people. Similar fingerprints remain separate profiles. IPs can be shared or change.

A random localStorage browser ID expires after 30 days; a sessionStorage tab session rotates after 30 minutes without observed activity. Only site-keyed HMACs of these tokens and event IDs are stored. A fingerprint hashes the bounded reported user agent, language, timezone, screen size, pixel ratio, logical processor count and touch points with the same server key. No canvas, audio, installed-font scanning or cross-site identifiers are used. Fingerprints indicate similar reported configurations and do not establish identity. Optional `ANALYTICS_HASH_SECRET` supplies a dedicated 32-character-or-longer key; otherwise `JWT_SECRET` is used. Changing the key starts new profiles and fingerprints.

Full observed IPs, user agents, bounded device signals and journey events are retained for 30 days. IP comes only from a single valid `X-Real-IP`, never the submitted payload or an arbitrary forwarded chain. The inspected production boundary restricts the app to Nginx, which overwrites this header from the trusted Cloudflare client header. Production trusts that boundary by default; other deployments must set `ANALYTICS_TRUST_PROXY=false` unless their proxy overwrites the header and blocks direct app access. Country comes only from a supplied proxy country header; unknown stays unknown, and no IP is sent to an external lookup provider. Infrastructure logs have independent policies.

Query strings, fragments, URL credentials and email/telephone destinations are removed from telemetry. Only bounded `utm_source`, `utm_medium` and `utm_campaign` values are accepted. DNT/GPC, the privacy-page browser opt-out and common bot user agents suppress browser events. Opt-out clears the browser's local identifiers and stops new events; existing details expire under retention. Contact analytics are recorded only after a message is stored and never contain its name, email or body; counting failure does not fail the form. Visitor APIs require the existing administrator guard and return no-store responses.

Visible-page time is accumulated while the document is visible, with bounded 30-second engagement flushes. Engagement means at least ten seconds visible, multiple page views, or an accepted contact submission. Page coverage includes the viewport and is not proof that text was read. Navigation time measures navigation start through DOMContentLoaded for full document loads, not SPA transitions or Core Web Vitals. Recently active means observed in the last five minutes and is not a continuous presence guarantee.

Each day admits at most 2,000 aggregate dimensions using a database lock; established counters increment atomically. Detailed capture admits at most 20,000 events per UTC day; a report warning identifies capped periods and aggregate counts continue. A transaction serializes admission, deduplicates event IDs and writes detail and aggregate counts together. Capture and admin reads prune expired detail at most hourly per process; read filters exclude expired history immediately. The persistent Node server also runs an hourly cleanup during quiet periods. Physical deletion therefore has up to one hour of cleanup latency while the server is running; the first capture/admin read after downtime cleans expired data. Cleanup failures emit a generic server warning and retry. Aggregate buckets retain 180 days and are pruned at most daily. No extra service or infrastructure scheduler is installed. Historical `analytics_link::` settings remain read-only lifetime totals, separately labelled; earlier history cannot be reconstructed.

## Publishing

Posts have a working draft, explicit publication, a monotonically increasing version, recoverable Trash, and up to 50 content revisions. An autosave to a published post writes `draft_snapshot`; public columns retain the last published article. Blog lists, search, tags, feeds and social previews use the public article. Publication copies the working draft into those columns in one transaction. Revision restoration creates a working draft and does not publish it. Slugs remain fixed after first publication.

CMS mutations require the current integer `version`. Missing versions return 428; stale versions return 409 without overwriting changes. The editor serializes saves, flushes pending edits before preview/navigation/publication, catches network errors, and warns on a browser unload with unsaved work. Browser Back navigation and process crashes are not durable offline editing. Images need alt text and articles need a title, valid slug, excerpt and body before publication.

Trash restoration returns posts as drafts. No permanent-delete UI is provided. Revision recovery retains content, not a full backup of uploaded media; media pruning is outside this release.

## Contact inbox

The inbox searches name, email and message body, pages 20 results at a time, and supports NEW, OPEN, RESOLVED and ARCHIVED states. Read status is separate. Administrators can add a private note and apply read/resolve/archive actions to up to 20 selected messages. A batch is transactional: one stale version rejects the whole batch. Archived messages can be restored. Notes have unsaved-change warnings. Compose email opens a mail client; the CMS does not send email or track replies/delivery.

## Projects, settings and accountability

Project and case-study updates are transactional, and project ordering is saved as one versioned transaction. Project Trash preserves records and case studies; restoration returns the project to its prior catalog state. Public lookups, navigation and sitemap omit trashed projects. Site settings use a version token and a consistent database snapshot, and preserve unsaved form data on background refreshes. Failures are shown instead of being presented as empty datasets or default settings.

The protected activity API shows the latest 50 operations with administrator attribution. Database audit records are retained independently of the revision cap. No article bodies, contact message bodies or note text are copied into audit summaries. This is an application audit log, not an immutable external compliance archive. Existing administrator authentication and role guards remain enforced; team delegation, approval roles, scheduled publication, CRM integration and email delivery are outside this implementation.

## Verification

- Unit tests: `npm test`.
- Type check: `npx tsc --noEmit`; lint: `npm run lint`; build: `npm run build`.
- Migration: `prisma migrate deploy` against a fresh disposable database, followed by `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`.
- Database workflows: set `CMS_TEST_DATABASE_URL` to an isolated **loopback** database named `cms_qa`, `cms_test`, or a suffixed variant, then run `npm run test:cms`. The guarded loader rejects other hosts/database names. It replaces only Next's server-only import marker for this Node test process; application builds retain the marker.
- The local Linux CI runner now creates a separate `cms_test` database in its disposable Compose PostgreSQL instance, deploys migrations and runs these workflow tests before the existing browser/build gates. Port 18090 is bound to loopback in the test Compose file only.
- Browser QA uses synthetic content, contact records and traffic: normal preview login, read status/notes, unsaved-note confirmation, post autosave/private draft/explicit publication, revision history, project create/Trash/restore, CSV download, both themes and a 390px responsive viewport. Visitor QA covers pagination, IP search, empty results, profile journeys, matching fingerprints, public navigation/contact conversion and browser opt-out. Screenshots are previews, not production traffic evidence.
- HTTP checks cover unauthenticated visitor list/detail, cross-origin analytics mutations, DNT/GPC handling and malformed contact JSON. Database workflows additionally verify visitor event deduplication, header IP provenance, distinct same-fingerprint profiles, 30-day cleanup and capacity fallback.

## Promotion and recovery

Before promotion, retain the current image identity, fresh database dump and media recovery references. Apply the additive migrations using the established deployment helper, then verify the exact deployed revision, normal SSO sign-in, CMS datasets, draft/public separation, inbox writes, visitor capture/proxy provenance, opt-out and public routes. New daily metrics and visitor detail start at deployment; historical numbers will not fill earlier periods.

A database migration does not reverse on application rollback. Published article columns remain compatible with a previous reader, so an old application cannot expose working drafts. **Previous images do not honor project Trash, revision recovery or version checks**: they can relist trashed projects and accept incompatible editing behavior. Keep the CMS unavailable for writes during such an emergency rollback, review any trashed project exposure, and prefer a forward repair. Do not drop the new tables/columns or restore an old dump over newer writes automatically.

The local preview uses isolated data and does not qualify production SSO, external devices, email delivery or load capacity. Owner acceptance and production promotion are separate from source validation.
