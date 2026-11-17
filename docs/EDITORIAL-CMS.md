# V1 content editing

Verified implementation: 16 November 2026. Private DEV is the delivery target; production has a separate branch and database.

Projects, blog posts and About share a visual content editor. Authors can insert ordinary prose, headings, lists, code, images, wide images, text beside an image, and a manually browsed carousel. Image descriptions and optional captions are edited inline. Project images can be reused in the story; the first gallery image is the cover, falling back to the first story image. Existing gallery order is preserved.

Project title and story appear first. Summary, links, tags, number, year, feature and ordering controls are optional or have defaults. The server allocates a numeric project number when omitted. Existing numbers and URLs remain unchanged. Previously authored Challenge/Concept/Highlights sections remain available under existing additional sections; new stories can use their own headings.

Blog addresses follow the title until publication and remain frozen afterwards. Summaries derive from body text when omitted. Read time and publication date are automatic. Saves are serialized; the editor submits the last confirmed `updatedAt` so stale writes receive 409 rather than overwriting another editor. Project metadata and its story save in one transaction. About also uses a version check and returns the version of its own saved row.

## Storage and compatibility

- Project metadata stays in `Project`; `project_case_<number>` settings JSON gains optional `bodyJson`. Legacy Markdown, galleries, and additional sections are preserved. Opening a legacy story does not convert it on a metadata-only save. Visual edits support GFM tables as structured table nodes.
- Blog documents remain in `Post.bodyJson`, with legacy `Post.content` as the fallback. New media nodes are `mediaText` (image plus prose children) and `carousel` (image children); images accept an explicit `wide` layout. Normalization preserves the post image-source policy. Projects use their existing project media policy.
- About is one `SiteSetting` row, `about_page_content`, containing profile facts, personal note, tech groups and a normalized document. Without a row, defaults reproduce the original copy. Home reads the same current role and personal note. `GET /v1/api/about` is public; `PUT` requires same-origin ADMIN authorization and the last version.
- No database migration, new account, or authentication bypass is introduced. Existing SSO/session and image magic-byte, MIME, size, filename and batch checks remain in force.

## Footer

The existing Tenor Chuckles GIF has a solid-black terminal frame. `public/media/chuckles-loop.gif` is a lossless format repair: the first 55 frames, pixels and durations are unchanged; only that terminal frame is removed. The existing exact Tenor URL and an empty setting map to the repaired local asset; other custom GIF URLs retain their behavior. The image starts visible and stays mounted when hidden. The build link uses the running `APP_REVISION`.

## Validation and recovery

`editorialLayouts.test.ts` covers document limits, media source boundaries, nested headings and descriptions, legacy tables, project round trips and About validation. `editorial-cms.spec.ts` exercises normal login, project creation/edition, upload/layout/carousel, legacy-table preservation, private preview, publish/archive, About save/conflicts, mobile overflow and accessibility. Mutation fixtures are restricted to the exact disposable CI stack or an explicitly enabled loopback preview. They bootstrap a synthetic admin through the existing seed workflow and authenticate through the normal login endpoint.

The normal DEV pipeline remains authoritative for build, browser gates, image delivery and rollout receipts. A health response alone does not prove publishing acceptance. Record deployed revision, readiness and real UI results in BookStack after delivery.

The disposable production-mode stack uses `https://127.0.0.1:18089` for both the app's canonical origin and the browser. `local-ci.py` generates a one-day self-signed certificate in a private temporary directory, mounts it into the test Nginx container, and removes it after Compose cleanup. OpenSSL is required on the runner. Certificate-error tolerance is limited to that exact loopback test origin in Playwright; runtime HTTPS validation and production same-origin checks are unchanged. For a manual Compose run, generate the same certificate pair as `cert.pem`/`key.pem`, set `PORTFOLIO_CI_TLS_DIR` to their directory and `PLAYWRIGHT_TEST_BASE_URL` to that exact HTTPS origin. Mutation fixtures remain restricted to the named disposable Compose database.

Rollback uses the previous DEV image and normal deployment helper; there is no schema rollback. New JSON stays stored, but older renderers do not understand new media nodes or About settings. Avoid editing new documents through an older editor, which may strip unfamiliar nodes. Retain the pre-release database backup and uploads if a content restore is reviewed later.
