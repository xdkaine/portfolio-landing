# CMS operations

Evidence date: 28 October 2026 (Pacific). This release replaces the `/v1/admin` dashboard with a responsive content workspace. Production promotion must use the existing K3s release process and its database backup and migration gates.

## Analytics

The public tracker records page loads and clicks into atomic PostgreSQL daily counters. The admin report offers 7, 30 and 90 UTC days, an equal preceding comparison period, a daily data table, CSV export, and rankings for pages, destinations, referrer hosts and broad device categories. Today is partial. These are event counts, not unique visitors or sessions. The data is unaudited and client events can be blocked or spoofed.

No visitor cookies, visitor IDs, raw IP addresses or raw user agents are stored in the analytics tables. IP addresses remain in the pre-existing in-memory rate limiter; infrastructure logs have independent policies. Query strings, fragments, URL credentials and email/telephone destinations are removed from new telemetry. DNT/GPC and common bot user agents suppress browser events. Contact submissions are counted only after a message is successfully stored; counting failure does not fail the form.

Each day admits at most 2,000 distinct dimensions using a database lock; established counters increment atomically. An accepted event prunes buckets older than the 180-day reporting window, at most once daily per process. No new scheduler is installed. Historical `analytics_link::` settings remain read-only lifetime totals, separately labelled; daily history cannot be reconstructed from those totals.

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
- Browser QA uses synthetic content, contact records and traffic: normal preview login, read status/notes, unsaved-note confirmation, post autosave/private draft/explicit publication, revision history, project create/Trash/restore, CSV download, both themes and a 390px responsive viewport. Screenshots are previews, not production traffic evidence.
- HTTP checks cover unauthenticated access, cross-origin mutations, DNT handling and malformed contact JSON.

## Promotion and recovery

Before promotion, retain the current image identity, fresh database dump and media recovery references. Apply the additive migration using the established deployment helper, then verify the exact deployed revision, normal SSO sign-in, CMS datasets, draft/public separation, inbox writes and public routes. New daily metrics start at deployment; historical numbers will not fill earlier periods.

A database migration does not reverse on application rollback. Published article columns remain compatible with a previous reader, so an old application cannot expose working drafts. **Previous images do not honor project Trash, revision recovery or version checks**: they can relist trashed projects and accept incompatible editing behavior. Keep the CMS unavailable for writes during such an emergency rollback, review any trashed project exposure, and prefer a forward repair. Do not drop the new tables/columns or restore an old dump over newer writes automatically.

The local preview uses isolated data and does not qualify production SSO, external devices, email delivery or load capacity. Owner acceptance and production promotion are separate from source validation.
