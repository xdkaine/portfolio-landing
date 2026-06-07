# Deployment

Production deploys are designed for free home infrastructure. GitHub Actions builds the app image, then a self-hosted GitHub Actions runner on the home server updates the application stack locally. The runner is a separate long-lived service and is not restarted for normal application deploys.

## Normal Operation

Leave both Compose projects running on the home server:

- `portfolio-runner` keeps the GitHub Actions runner online so it can receive deploy jobs.
- The application stack keeps the website, database, proxy, and tunnel running.

After the one-time runner setup, pushing to `main` is enough to deploy. GitHub Actions builds a new immutable app image, and the online runner pulls that image and runs `docker compose up -d` for the application stack. The `app` container is recreated when its image changes, so a brief application handoff on deployment is expected; the runner should remain online throughout.

Changes to `compose.runner.yml` cannot apply themselves: a runner cannot safely replace the container executing its current deploy job. When runner configuration changes, copy or sync the updated file and recreate the runner once from the host. After that one-time step, manual restarts should not be required for ordinary pushes.

After an updated runner definition is present on the host and no deploy job is running, apply it once:

```bash
cd /mnt/Orion/docker/stacks/production-portfolio
docker compose -f compose.runner.yml --env-file .env.runner up -d --force-recreate github-runner
docker compose -f compose.runner.yml --env-file .env.runner ps
```

## Pipeline

The workflow in `.github/workflows/ci.yml` does the following:

1. Runs `npm ci`, TypeScript checks, ESLint, tests, and a full dependency audit
   on every push and pull request.
2. Runs `npm run build` with a dummy database URL so the Next.js build can complete in CI.
3. On `main`, builds separate web and migration images with BuildKit provenance
   and SBOM attestations:
   - `ghcr.io/xdkaine/portfolio-landing:<commit-sha>`
   - `ghcr.io/xdkaine/portfolio-landing:latest`
   - `ghcr.io/xdkaine/portfolio-landing-migrate:<commit-sha>`
   - `ghcr.io/xdkaine/portfolio-landing-migrate:latest`
4. On `main`, runs the deploy job on the home server runner labeled `truenas`
   and `portfolio-landing`, validates the deployment configuration, syncs the
   compose/nginx deployment bundle into `DEPLOY_PATH`, creates and verifies a
   PostgreSQL backup, waits for the migration container to finish successfully,
   starts the application stack, and verifies both the running image and
   `/api/health`.

This avoids paid hosting and does not require opening inbound SSH to GitHub Actions. The runner maintains an outbound connection to GitHub instead.

## GitHub Configuration

Create these repository variables:

| Variable | Purpose |
| --- | --- |
| `DEPLOY_PATH` | Directory on the home server that contains the production `.env` and receives the deployment bundle. Defaults to `/mnt/Orion/docker/stacks/production-portfolio`. |

Create these additional repository variables if production should differ from the defaults:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public site URL baked into the image. Defaults to `https://phao.dev`. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public Cloudflare Turnstile site key. Compose also passes this to the server as `TURNSTILE_SITE_KEY` so the runtime config route is not affected by Next.js public env inlining. |

## Server Setup

Install Docker with Docker Compose v2 on the home server. The current deploy directory is:

```bash
/mnt/Orion/docker/stacks/production-portfolio
```

If the GitHub runner service does not run as `root`, make sure its user owns or can write to that directory.

Create a production `.env` in that directory. Start from `.env.example` and fill in real values:

```env
POSTGRES_PASSWORD="replace-with-openssl-rand-hex-32"
NEXT_PUBLIC_SITE_URL="https://phao.dev"
GOOGLE_SITE_VERIFICATION=""
JWT_SECRET="replace-with-openssl-rand-base64-32"
NEXT_PUBLIC_TURNSTILE_SITE_KEY="replace-with-turnstile-site-key"
TURNSTILE_SECRET_KEY="replace-with-turnstile-secret-key"
CLOUDFLARED_TUNNEL_TOKEN="replace-with-tunnel-token"
```

Use a hexadecimal PostgreSQL password so it can be embedded safely in the
internal connection URL. Production startup now fails if the database, JWT, or
Turnstile secrets are missing. The app database URL is assembled inside
`docker-compose.yml` because PostgreSQL is on the same Compose network.

`NEXT_PUBLIC_SITE_URL` must be the canonical public HTTPS origin with no path,
for example `https://phao.dev`. Production startup rejects HTTP URLs and URLs
containing a path.

PostgreSQL is not published to the host in the production definition. For
local database access, use the development override:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
```

### Existing Database Password Rotation

Before deploying the hardened Compose definition to an existing `pgdata`
volume, rotate the database role and update the host `.env` in one maintenance
window:

```bash
cd /mnt/Orion/docker/stacks/production-portfolio
NEW_POSTGRES_PASSWORD="$(openssl rand -hex 32)"
printf "ALTER ROLE xtomm WITH PASSWORD '%s';\n" "$NEW_POSTGRES_PASSWORD" \
  | docker compose exec -T db psql -U xtomm -d portfolio
printf '\nPOSTGRES_PASSWORD="%s"\n' "$NEW_POSTGRES_PASSWORD" >> .env
unset NEW_POSTGRES_PASSWORD
chmod 600 .env
```

If `.env` already contains `POSTGRES_PASSWORD`, replace that line instead of
adding a duplicate. Verify the updated value before deploying. Do not place the
password on a command line that will be retained in shell history.

Install a GitHub self-hosted runner from the repository settings, or use the containerized runner below:

1. Go to GitHub: Settings -> Actions -> Runners -> New self-hosted runner.
2. Choose Linux and follow GitHub's install commands on the home server.
3. Add custom runner labels named `truenas` and `portfolio-landing` during configuration.
4. Run the runner as a service so deploys work after reboots.

The runner user must be able to run Docker without an interactive password prompt. On most Linux hosts that means adding the user to the `docker` group and starting a new login session.

```bash
sudo usermod -aG docker <runner-user>
```

### Containerized Runner On TrueNAS

On TrueNAS, run the GitHub runner as a separate compose service in this project folder. Do not install the runner inside the app container: deploying the app recreates the app container, which would stop the runner mid-deploy.

This repository includes `compose.runner.yml`, modeled after the Repairte runner stack. From the production stack directory:

```bash
cd /mnt/Orion/docker/stacks/production-portfolio
```

If the runner is offline, update `compose.runner.yml` in that directory
manually before restarting it. The CI deploy job cannot sync an updated runner
definition until a runner is online to execute that job.

Create a host-only `.env.runner` for the runner:

```env
GITHUB_ACCESS_TOKEN="paste-a-classic-github-pat-here"
```

Create the token at GitHub -> Developer settings -> Personal access tokens -> Tokens (classic). Grant `repo` scope for this private repository.

The runner compose file uses this shape:

```yaml
name: portfolio-runner

services:
   github-runner:
      image: myoung34/github-runner:2.334.0
      container_name: portfolio-github-runner
      restart: unless-stopped
      environment:
         RUNNER_SCOPE: "repo"
         REPO_URL: "https://github.com/xdkaine/portfolio-landing"
         RUNNER_NAME: "truenas-portfolio-runner"
         ACCESS_TOKEN: "${GITHUB_ACCESS_TOKEN}"
         RUNNER_WORKDIR: "/mnt/Orion/docker/stacks/production-portfolio/_work"
         LABELS: "self-hosted,linux,truenas,portfolio-landing"
         CONFIGURED_ACTIONS_RUNNER_FILES_DIR: "/runner/data"
         DISABLE_AUTOMATIC_DEREGISTRATION: "true"
         UNSET_CONFIG_VARS: "true"
      volumes:
         - /var/run/docker.sock:/var/run/docker.sock
         - /mnt/Orion/docker/stacks:/mnt/Orion/docker/stacks
         - runner-credentials:/runner/data
```

Start it:

```bash
docker compose -f compose.runner.yml --env-file .env.runner up -d
docker compose -f compose.runner.yml --env-file .env.runner logs -f github-runner
```

The runner should appear in GitHub with the `self-hosted`, `linux`, `truenas`, and `portfolio-landing` labels. The deploy workflow requires all four labels.

`CONFIGURED_ACTIONS_RUNNER_FILES_DIR` is required when registration should survive a
container or host restart. Keep `DISABLE_AUTOMATIC_DEREGISTRATION` enabled with
that persistence mode; otherwise a normal container stop can unregister the
runner while leaving local reusable settings behind.

If an older runner container is looping with `Cannot configure the runner
because it is already configured`, repair it once before bringing up the
persistent configuration:

```bash
cd /mnt/Orion/docker/stacks/production-portfolio
docker compose -f compose.runner.yml --env-file .env.runner down
docker volume rm portfolio-runner_runner-credentials
```

In GitHub, remove the offline `truenas-portfolio-runner` registration under
Settings -> Actions -> Runners, then start the container again:

```bash
docker compose -f compose.runner.yml --env-file .env.runner pull
docker compose -f compose.runner.yml --env-file .env.runner up -d
docker compose -f compose.runner.yml --env-file .env.runner logs --tail=100 -f github-runner
```

Deleting this runner-only credential volume does not delete the application
database or uploaded application files. Do not delete `pgdata`,
`project_uploads`, `post_uploads`, or the legacy `public_data` volume while
old uploaded media still needs fallback reads.

If it stops again after clean registration, capture the container reason before
recreating it:

```bash
docker inspect portfolio-github-runner --format '{{json .State}}'
docker inspect portfolio-github-runner --format '{{.RestartCount}}'
docker logs --tail=200 portfolio-github-runner
```

An exit code, an out-of-memory marker, or a host-reboot timestamp separates a
runner lifecycle problem from a TrueNAS resource or Docker daemon problem.

Do not run the app stack with `--remove-orphans` from this directory unless the runner is isolated with the `name: portfolio-runner` compose project. Otherwise Compose can treat the runner as an orphan and stop the job that is currently deploying.

The `/var/run/docker.sock` mount lets the runner deploy with the host Docker daemon. Treat that runner as privileged host access: do not use it for untrusted repositories or untrusted pull request workflows.

If the app is reached through Cloudflare Tunnel, keep `CLOUDFLARED_TUNNEL_TOKEN` in the host `.env`. No inbound web ports need to be opened for the app.

## TrueNAS Host Notes

The production stack currently lives at:

```bash
/mnt/Orion/docker/stacks/production-portfolio
```

Keep the real `.env` only on the host. The deploy workflow syncs `docker-compose.yml`, `nginx/`, and `.env.example`; it does not overwrite `.env`.

Lock down the host `.env` so it is not world-readable or world-writable:

```bash
chmod 600 /mnt/Orion/docker/stacks/production-portfolio/.env
```

If the runner service does not run as `root`, set ownership to the runner user after changing permissions:

```bash
chown <runner-user>:<runner-user> /mnt/Orion/docker/stacks/production-portfolio/.env
```

If secrets are pasted into logs, chat, screenshots, or tickets, rotate them before relying on the deployment. That includes the JWT secret, Cloudflare Turnstile secret, and Cloudflare Tunnel token.

PostgreSQL is private to the Compose network in production. Do not add a host
port outside the local-only `docker-compose.dev.yml` override.

## First Deployment After Security Hardening

No application source files or upload files need to be moved manually. A push
to `main` syncs `docker-compose.yml`, the self-contained Nginx configuration,
`.env.example`, and the immutable application images. Existing database and
upload volumes remain in place.

Complete these one-time host actions before or during the first hardened
deployment:

1. Add `POSTGRES_PASSWORD` and verify all required production values in the
   host `.env`. Rotate `JWT_SECRET`; existing administrator sessions will be
   logged out.
2. Rotate the existing PostgreSQL role password in the maintenance window
   described above, then set `chmod 600 .env`.
3. If the production database predates checked-in Prisma migrations, complete
   the baseline procedure below before normal automated migration deployment.
4. Merge or push the reviewed changes to `main`. The deploy job performs the
   file sync, image pull, backup, migration, startup, and health verification.
5. After no deploy job is running, recreate the long-lived runner once if
   `compose.runner.yml` changed:

```bash
docker compose -f compose.runner.yml --env-file .env.runner up -d --force-recreate github-runner
```

The deployment workflow does not overwrite the host `.env` and cannot safely
recreate the runner container that is executing the deployment.

## Manual Deploy Or Rollback

From the server deploy directory, deploy any previously built image tag with:

```bash
APP_IMAGE=ghcr.io/xdkaine/portfolio-landing:<commit-sha> docker compose pull app
MIGRATE_IMAGE=ghcr.io/xdkaine/portfolio-landing-migrate:<commit-sha> docker compose pull migrate
APP_IMAGE=ghcr.io/xdkaine/portfolio-landing:<commit-sha> \
MIGRATE_IMAGE=ghcr.io/xdkaine/portfolio-landing-migrate:<commit-sha> \
docker compose up -d --no-build
```

The `pgdata`, `project_uploads`, and `post_uploads` Docker volumes are kept
across deploys. The legacy `public_data` volume is mounted read-only at
`/app/legacy-public` so media uploaded before the upload volume split remains
readable without masking built files in `/app/public`.

The automated rollback restores the previous application image when the new
application fails health checks. It does not reverse an applied database
migration. Production migrations must therefore remain backward-compatible
with the previous application version; destructive schema cleanup should be a
later deployment after the old application can no longer be rolled back.

## Database Migration Baseline

The application now uses checked-in Prisma migrations. Production was originally initialized without migration history, so baseline it once before the first deployment containing the blog publication studio. Copy the updated `docker-compose.yml` to the host first so the `migrate` service exists there:

```bash
cd /mnt/Orion/docker/stacks/production-portfolio
mkdir -p backups
docker compose exec -T db pg_dump -U xtomm portfolio | gzip > backups/portfolio-before-prisma-baseline.sql.gz
MIGRATE_IMAGE=ghcr.io/xdkaine/portfolio-landing-migrate:<new-image-tag> docker compose pull migrate
MIGRATE_IMAGE=ghcr.io/xdkaine/portfolio-landing-migrate:<new-image-tag> docker compose run --rm migrate npx prisma migrate resolve --applied 20260525000000_baseline
MIGRATE_IMAGE=ghcr.io/xdkaine/portfolio-landing-migrate:<new-image-tag> docker compose run --rm migrate npx prisma migrate deploy
```

After the baseline is registered, routine deployments run `prisma migrate deploy` automatically as part of the stack update. New project and post media are written to `project_uploads` and `post_uploads`; existing media in `public_data` remains available through the read-only legacy fallback.

## Seed Safety

Do not run `npm run db:seed` against an existing production database. Demo
content is disabled unless `ALLOW_DEMO_SEED=true` is set.

The known default admin account has been removed. To bootstrap the first user
on an empty database, set these values for one seed run:

```env
ALLOW_ADMIN_BOOTSTRAP="true"
BOOTSTRAP_ADMIN_EMAIL="admin@example.com"
BOOTSTRAP_ADMIN_PASSWORD="use-a-random-password-of-at-least-16-characters"
BOOTSTRAP_ADMIN_NAME="Portfolio Admin"
```

Run the seed once, then remove the password and set
`ALLOW_ADMIN_BOOTSTRAP=false`. The seed refuses to bootstrap when any user
already exists.
