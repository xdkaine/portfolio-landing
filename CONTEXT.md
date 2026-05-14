# Context

## Domain Terms

**Post Editorial**
The workflow for creating, updating, listing, and publishing blog posts. It owns post input rules such as slugs, dates, read time, tags, draft visibility, and default values.

**Project Catalog**
The collection of portfolio projects and their public/admin presentation. It owns project ordering, status display, lookup by id or number, and the shape returned to project callers.

**Project Case Study**
Editable long-form content attached to a project, including subtitles, write-ups, highlights, demo links, and gallery items.

**Link Click Metrics**
Aggregate click counts for tracked links. It owns metric payload sanitization, metric key generation, and summary data used by the admin dashboard.

**Admin Dashboard**
The authenticated editing surface for projects, posts, messages, settings, and metrics.
