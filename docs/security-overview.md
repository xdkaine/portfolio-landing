# Security Overview

Audit date: 2026-06-06

Implementation update: 2026-06-06

## Implementation Status

Implemented in the codebase:

- Production now fails closed on weak/missing JWT, database, and Turnstile secrets.
- Sessions are eight hours, use strict JWT claims, and are checked against the
  current database user and role.
- All CMS reads/writes enforce `ADMIN`; all mutations enforce same-origin requests.
- New uploads use raster magic-byte validation; uploaded SVG is rejected and no
  longer served.
- PostgreSQL is private by default and requires an explicit password.
- The known default admin seed was replaced with a one-time empty-database bootstrap.
- Project/case-study inputs and analytics cardinality are bounded.
- The web and migration images are separated; standalone artifacts are sanitized.
- Full dependency audit findings were reduced from 21 to zero.
- CI now runs tests, a full dependency audit, and emits SBOM/provenance attestations.
- Nginx uses Cloudflare's client IP, the edge CSP matches the application policy,
  security headers apply to every response location, and uploads alone receive
  the larger request-body limit.
- Deployments verify backups, wait for migrations before starting the app, verify
  immutable image tags, and restore the previous app image after failed health checks.

Still requires operational or later-phase work:

- Rotate the existing production PostgreSQL and JWT secrets before deployment.
- Put administration behind MFA/Cloudflare Access.
- Replace the classic runner PAT and isolate the Docker-socket runner further.
- Add persistent audit events, immediate session revocation, encrypted backups,
  and contact-message lifecycle controls.

## Scope

This review covered:

- Next.js application routes, request proxy, rendering, and browser controls
- Authentication, authorization, sessions, login protection, and admin mutations
- Contact submissions, analytics writes, CMS content, and media uploads
- Prisma models, migrations, seed behavior, and PostgreSQL exposure
- Docker, Nginx, Cloudflare Tunnel, GitHub Actions, and the self-hosted runner
- Dependency advisories, secret handling, build output, and existing tests
- Read-only HTTP header checks against `https://phao.dev`

This was a source-assisted review, not a destructive penetration test. No
authenticated production actions, credential attacks, or denial-of-service
tests were performed.

## System And Trust Boundaries

The public edge is Cloudflare Tunnel -> Nginx -> Next.js. PostgreSQL and
persistent upload volumes sit on the private Docker network. The application
has four important data classes:

1. Admin credentials and session tokens
2. Contact-message personal data
3. Public CMS content and uploaded media
4. Deployment credentials, backups, and the self-hosted runner's host access

The highest-value application boundary is the session cookie and its
database-backed `ADMIN` authorization check. The highest-impact infrastructure
boundary is the self-hosted runner, which can control the Docker host.

## Executive Risk Summary

Overall posture after implementation: **moderate residual risk**, dominated by
the privileged self-hosted runner, lack of MFA/audit logging, and production
secret rotation that must be completed during deployment.

The deployed site has useful baseline controls: HTTPS/HSTS, an HttpOnly secure
cookie, bcrypt password hashes, Turnstile support, input limits on contact and
post content, parameterized Prisma queries, randomized upload names, traversal
checks, a non-root application user, and restrictive headers on normal dynamic
pages.

The original fail-open auth, database, authorization, and active-upload findings
have been remediated in code. Residual risk remains concentrated in production
secret rotation and the privileged deployment runner.

## Findings

### SEC-01 Remediated: Authentication Fails Open Without `JWT_SECRET`

The original implementation used a known fallback secret. `sessionToken.ts`
now rejects missing, short, or known secrets in production; Compose requires
the value; tokens validate algorithm, issuer, audience, subject, and role; and
server authorization loads the current user.

Remediation:

- Make production startup fail when the secret is absent, short, or known.
- Require at least 32 random bytes and rotate the current production secret.
- Centralize token configuration so middleware and route handlers cannot drift.
- Validate algorithm, issuer, audience, subject, role, and claim types.
- Add a regression test proving a token signed with the old fallback is rejected.

### SEC-02 Code Remediated, Rotation Required: PostgreSQL Default Password

The hardened Compose definition requires `POSTGRES_PASSWORD` and no longer
publishes PostgreSQL. The existing production role must still be rotated before
the new definition is deployed.

Remediation:

- Generate a unique production database password and rotate it.
- Remove the host port from the production stack. Use a development override
  bound to `127.0.0.1` when local database access is needed.
- Move the connection string into a Docker secret or root-readable host env file.
- Confirm NAS/firewall rules do not expose `5434`.

### SEC-03 Remediated: CMS APIs Check Session Presence, Not Role Or User State

All protected CMS APIs now use centralized admin guards. Session verification
loads the current user and rejects deleted users or stale role claims. The
declared `EDITOR` role currently has no CMS permissions.

Remediation:

- Replace route-local checks with `requireRole("ADMIN")` or explicit permissions.
- Load the current user for sensitive operations and reject deleted/disabled users.
- Define an authorization matrix for `ADMIN` and `EDITOR`.
- Return `403` for authenticated users without permission.
- Add route tests for anonymous, editor, admin, deleted-user, and stale-role cases.

### SEC-04 Remediated: Project Uploads Permit Active SVG And Trust Client MIME

New project uploads accept raster formats only and verify file signatures before
choosing an extension. Uploaded SVG is neither accepted nor served. Nginx and
the application now share the stronger production CSP.

Remediation:

- Reject SVG immediately unless there is a strong product requirement.
- Decode raster files server-side and verify magic bytes, dimensions, and format.
- Re-encode images to strip active content and metadata.
- Prefer a separate cookieless media origin.
- If SVG must exist, sanitize it with a maintained parser and serve it as an
  attachment or under a sandboxed policy.

### SEC-05 Partially Remediated: The Self-Hosted Runner Is A Host-Root Trust Boundary

The runner still mounts `/var/run/docker.sock` and the host stacks directory and
receives a classic repository PAT. Its image is version-pinned, but a runner
image compromise, workflow compromise on `main`, or credential theft can still
become full Docker-host control.

Remediation:

- Pin the runner image and all deployment images by digest.
- Replace the classic PAT with a short-lived GitHub App or runner registration flow.
- Restrict the runner to one trusted repository and protected production environment.
- Require branch protection, review, and signed/verified deployment provenance.
- Run the runner on an isolated VM where compromise does not expose unrelated NAS data.
- Treat every deploy workflow change as privileged infrastructure code.

### SEC-06 Remediated: A Known Default Admin Can Be Re-enabled

The known account and password path has been removed. Bootstrap now requires
explicit one-time credentials, a password of at least 16 characters, and an
empty users table.

Remediation:

- Delete the known credential path.
- Bootstrap the first admin with a one-time random secret supplied at runtime.
- Refuse bootstrap when `NODE_ENV=production` unless an explicit one-time token is
  present, then invalidate it after use.

### SEC-07 Partially Remediated: Rate Limiting Behind Cloudflare Tunnel

Nginx now keys limits from Cloudflare's connecting-IP header and forwards only
that selected value to the app. Application limits still live in process memory,
so they reset on restart and do not coordinate across replicas.

Remediation:

- Establish one trusted client-IP source, preferably Cloudflare's connecting-IP
  header accepted only from the tunnel network.
- Key Nginx and application limits consistently.
- Move security-sensitive limits to Cloudflare WAF/Rate Limiting or a shared store.
- Add account-plus-IP throttling for login and alerts for sustained failures.

### SEC-08 Remediated: Runtime Dependency And Image Surface

Dependencies were upgraded and patched overrides applied. CLI-only tooling moved
to development dependencies, migration tooling moved to a separate image, and
both the full and production-only dependency audits now report zero findings.

Remediation:

- Upgrade Next.js, Prisma, Prisma Client, adapter packages, and lockfile together.
- Move CLI-only packages such as `shadcn` out of production dependencies.
- Split the migration image from the application runtime image.
- Install/copy only production runtime dependencies into the app image.
- Add `npm audit`, SBOM generation, and container scanning with an allowlist for
  reviewed non-reachable findings.

### SEC-09 Remediated: Standalone Tracing Copies Excess Project Material

Upload paths now carry tracing exclusions and the build sanitizes standalone
output. Environment files, source, tests, docs, and deployment files are removed
before the artifact is accepted.

Remediation:

- Scope upload fallback paths so Next file tracing includes only required folders.
- Add a build assertion that `.env`, tests, docs, source, and deployment files are
  absent from release artifacts.
- Never distribute `.next/standalone` from a workspace containing secrets.
- Keep `.env*`, VCS data, backups, and runner credentials explicitly excluded.

### SEC-10 Mostly Remediated: Project And Analytics Input Limits

Project and case-study fields now have size and count limits, rendered external
URLs require HTTP(S), gallery media is restricted, and analytics has stricter
rate/cardinality limits. A dedicated bounded analytics table and retention
policy would still be cleaner than the current key-value store.

Remediation:

- Define shared schemas with field, array, document, and request-size limits.
- Permit only `https:` and intentional internal paths for rendered URLs/media.
- Validate Markdown image/link destinations using the same rules as post content.
- Whitelist trackable links or aggregate into a bounded metrics table.
- Add retention or compaction for analytics data.

### SEC-11 Partially Remediated: Session And Admin Detection Controls

Sessions now last eight hours and current user/role state is checked on every
server authorization. Immediate token revocation, MFA, and a persistent audit
trail are still absent.

Remediation:

- Shorten admin session lifetime and rotate tokens after authentication.
- Add MFA or put `/admin` and `/api/admin` behind Cloudflare Access.
- Add `jti`-based revocation or a server-side session table.
- Record login failures, successful logins, content mutations, actor, IP, and time.
- Alert on repeated failures and unusual admin activity.

### SEC-12 Partially Remediated: Backups And Contact PII Lifecycle

Deploys now create the backup directory with mode `0700`, apply `umask 077`, and
delete deployment backups older than 30 days. Encryption and contact-message
lifecycle controls remain outstanding.

Remediation:

- Encrypt backups, write with mode `0600`, test restores, and enforce retention.
- Keep backups outside runner-writable application paths where practical.
- Define contact-message retention and admin deletion/export procedures.
- Avoid including message content or credentials in logs and CI artifacts.

### SEC-13 Partially Remediated: Browser Policy And Fingerprinting

Nginx and application CSPs are aligned, `unsafe-eval` was removed from the edge
policy, and `X-Powered-By` is disabled. The CSP still requires `'unsafe-inline'`
and the public health endpoint exposes the deployment revision.

Remediation:

- Generate one canonical CSP and use nonces/hashes for inline scripts.
- Apply the same policy to uploads and error responses.
- Set `poweredByHeader: false`.
- Return detailed revision data only to an internal health endpoint.
- Add automated live-header assertions after deployment.

### SEC-14 Remediated: Mutation Routes Lack Explicit Origin Checks

All state-changing routes now reject cross-site `Origin`/`Sec-Fetch-Site`
requests in addition to the existing `SameSite=Lax` cookie behavior.

Remediation:

- Reject cross-site mutation requests using an origin helper.
- Add CSRF tokens if cross-site integrations are introduced.
- Keep cookies host-only and consider a `__Host-` cookie name.

## Existing Strengths

- Passwords use bcrypt with cost 12.
- Session cookies are HttpOnly, secure in production, and `SameSite=Lax`.
- Prisma avoids hand-built SQL in the reviewed request paths.
- Post content uses node/mark allowlists and protocol checks.
- Contact submissions enforce lengths, email shape, consent, honeypot, optional
  Turnstile, and rate limits.
- Upload filenames are randomized and read paths defend against traversal.
- The application process runs as a non-root user.
- Deployments use commit-specific application image tags and verify revisions.
- Current tracked files and reachable Git history showed no high-confidence
  private keys or provider tokens.

## Remediation Plan

### Phase 0: Containment, 0-2 Days

1. Completed in code: fail production startup without strong JWT, database, or
   Turnstile configuration.
2. Operational action: rotate the existing PostgreSQL and JWT secrets before
   deploying this version.
3. Completed: remove the production PostgreSQL host port; the optional local
   override binds only to `127.0.0.1`.
4. Completed: disable SVG uploads and reject MIME-spoofed image files.
5. Completed: remove the known default-admin seed path.
6. Partially completed: runner and Cloudflare images use fixed release tags;
   digest pinning remains outstanding.

Exit criteria:

- A fallback-signed token receives `401`.
- Production cannot boot with empty auth or database secrets.
- PostgreSQL is not reachable from the public/LAN interface unless explicitly allowed.
- SVG and non-image payloads receive `400`.

### Phase 1: Authorization And Input Boundaries, 1 Week

1. Completed: centralized admin guards perform current-user and role lookup.
2. Completed for the current policy: only `ADMIN` can access CMS APIs; `EDITOR`
   has no CMS permissions.
3. Completed: all reviewed mutations enforce same-origin requests.
4. Completed: project, case-study, upload, and analytics inputs are bounded.
5. Outstanding: move application rate limiting to a trusted edge/shared store.
6. Outstanding: add MFA or Cloudflare Access for administration.

Exit criteria:

- Every mutation has anonymous, editor, admin, and stale-session tests.
- Unsafe URL schemes and oversized documents are rejected.
- Limits remain effective across restarts and identify real clients.

### Phase 2: Supply Chain And Runtime Hardening, 1-2 Weeks

1. Completed: production dependency audit reports zero findings.
2. Completed: app and migration images are separate; the app image has no Prisma
   CLI, source tree, tests, environment file, or migrations.
3. Completed: standalone output is sanitized and asserted during tests.
4. Partially completed: release tags are pinned; immutable action/image digests
   remain outstanding.
5. Completed for the app, proxy, and tunnel: read-only filesystems, minimized
   capabilities, `no-new-privileges`, and an explicit non-root application user.
6. Completed: BuildKit emits SBOM and provenance attestations for both images.
7. Outstanding: add container and secret scanning to CI.

Exit criteria:

- No unreviewed high-severity runtime advisories.
- The app image contains no `.env`, source tests, runner files, or Prisma dev server.
- Container hardening checks run in CI.

### Phase 3: Detection, Recovery, And Privacy, 2-4 Weeks

1. Add authentication and CMS audit events with alerting.
2. Add session revocation and shorter admin expiry.
3. Encrypt backups, enforce permissions/retention, and test restore procedures.
4. Add contact-message retention and deletion controls.
5. Perform an authenticated DAST pass in staging.

Exit criteria:

- Admin actions are attributable and searchable.
- Compromised sessions can be revoked immediately.
- Backup restore and contact deletion are documented and tested.

## Verification Performed

- `npm run lint`: passed
- `npx tsc --noEmit`: passed
- `npm run build` with non-secret build configuration: passed without tracing
  warnings; standalone sanitization completed
- `npm test`: 41 passed, 0 failed
- `npm audit --audit-level=high`: zero findings
- `npm audit --omit=dev --audit-level=high`: zero findings
- `docker compose config --quiet` with required placeholder secrets: passed
- Docker `runner` and `migrate` targets: built successfully
- Runtime image inspection: runs as `nextjs`, is approximately 81 MB, and
  contains no `.env`, source tree, Compose file, migrations, or Prisma CLI
- Migration image inspection: runs as `nextjs` and contains Prisma migrations
  and deployment tooling
- Hardened runtime smoke test: passed under read-only root filesystem, dropped
  capabilities, `no-new-privileges`, and writable `tmpfs` mounts; `/api/health`
  returned `200`
- Isolated production Compose test: migration completed before application
  startup, application and Nginx health checks passed, and an unavailable
  upstream returned `503`
- Browser regression test: homepage, projects navigation, admin-to-login
  redirect, login form, and contact form rendered and navigated successfully
- Fail-closed runtime smoke test: the release image exited with code `1` before
  starting the server when `JWT_SECRET` was absent
- Read-only production header checks: normal pages have HSTS, CSP, frame denial,
  `nosniff`, referrer policy, and cross-origin policies; upload-path policy differs
- Git history pattern scan: no high-confidence provider tokens/private keys found

CI now runs linting, type checking, tests, full dependency audit, the application
build, and both Docker target builds. BuildKit emits SBOM and provenance
attestations. Secret and container vulnerability scanning remain planned
controls.
