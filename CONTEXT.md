# Context

## Domain Terms

**Post Editorial**
The workflow for creating, updating, listing, and publishing blog posts. Published columns retain the reader-visible article while `draft_snapshot` holds pending edits. Version checks, content revisions, publication validation and recoverable Trash protect editorial changes.

**Project Catalog**
The collection of portfolio projects and their public/admin presentation. It owns project ordering, status display, lookup by id or number, and the shape returned to project callers.

**Project Case Study**
Editable long-form content attached to a project, including subtitles, write-ups, highlights, demo links, and gallery items.

**Traffic Analytics**
Atomic daily aggregate counters for public page views, link clicks and accepted contact submissions, with UTC reporting periods and 180-day retention. Separate 30-day detail records provide pseudonymous browser profiles, tab sessions, observed proxy IPs, keyed device-similarity fingerprints, journeys, campaigns, engagement and full-navigation timing. Fingerprints do not merge profiles or identify people. DNT/GPC and browser opt-out suppress collection. Historical lifetime click counters remain separate.

**Contact Inbox**
Searchable, paginated contact messages with independent read status, workflow status, private notes, transactional bulk updates and conflict checks.

**CMS Activity**
Administrator-attributed application audit records for publishing, inbox, project and settings operations. Content recovery is provided by post revisions and Trash; the activity list itself is not an immutable compliance archive.

**Admin Dashboard**
The authenticated content workspace for projects, posts, messages, settings, aggregate/audience analytics, visitor inspection and activity. See `docs/cms-operations.md` for data contracts, verification and recovery limits.
