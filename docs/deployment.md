# Deployment

Production deploys are designed for free home infrastructure. GitHub Actions builds the app image, then a self-hosted GitHub Actions runner on the home server restarts Docker Compose locally.

## Pipeline

The workflow in `.github/workflows/ci.yml` does the following:

1. Runs `npm ci`, Prisma client generation, TypeScript checks, and ESLint on every push and pull request.
2. Runs `npm run build` with a dummy database URL so the Next.js build can complete in CI.
3. On `main`, builds the Docker image and pushes two GHCR tags:
   - `ghcr.io/xdkaine/portfolio-landing:<commit-sha>`
   - `ghcr.io/xdkaine/portfolio-landing:latest`
4. On `main`, runs the deploy job on the home server runner labeled `truenas` and `portfolio-landing`, syncs the compose/nginx deployment bundle into `DEPLOY_PATH`, pulls the exact commit image, restarts the stack, and verifies `/api/health` from inside the app container.

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
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public Cloudflare Turnstile site key baked into the client bundle. |

## Server Setup

Install Docker with Docker Compose v2 on the home server. The current deploy directory is:

```bash
/mnt/Orion/docker/stacks/production-portfolio
```

If the GitHub runner service does not run as `root`, make sure its user owns or can write to that directory.

Create a production `.env` in that directory. Start from `.env.example` and fill in real values:

```env
NEXT_PUBLIC_SITE_URL="https://phao.dev"
GOOGLE_SITE_VERIFICATION=""
JWT_SECRET="replace-with-openssl-rand-base64-32"
NEXT_PUBLIC_TURNSTILE_SITE_KEY=""
TURNSTILE_SECRET_KEY=""
CLOUDFLARED_TUNNEL_TOKEN=""
```

The app database URL is defined inside `docker-compose.yml` because the Postgres service is part of the same compose network.

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

Create a host-only `.env.runner` for the runner:

```env
GITHUB_ACCESS_TOKEN="paste-a-classic-github-pat-here"
```

Create the token at GitHub -> Developer settings -> Personal access tokens -> Tokens (classic). Grant `repo` scope for this private repository.

The runner compose file uses this shape:

```yaml
services:
   github-runner:
      image: myoung34/github-runner:latest
      container_name: portfolio-github-runner
      restart: unless-stopped
      environment:
         REPO_URL: "https://github.com/xdkaine/portfolio-landing"
         RUNNER_NAME: "truenas-portfolio-runner"
         ACCESS_TOKEN: "${GITHUB_ACCESS_TOKEN}"
         RUNNER_WORKDIR: "/mnt/Orion/docker/stacks/production-portfolio/_work"
         LABELS: "self-hosted,linux,truenas,portfolio-landing"
      volumes:
         - /var/run/docker.sock:/var/run/docker.sock
         - /mnt/Orion/docker/stacks:/mnt/Orion/docker/stacks
         - runner-credentials:/home/runner
```

Start it:

```bash
docker compose -f compose.runner.yml --env-file .env.runner up -d
docker compose -f compose.runner.yml --env-file .env.runner logs -f github-runner
```

The runner should appear in GitHub with the `self-hosted`, `linux`, `truenas`, and `portfolio-landing` labels. The deploy workflow requires all four labels.

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

Postgres is currently published on host port `5434`. Keep that blocked from the public internet unless remote database access is intentional.

## Manual Deploy Or Rollback

From the server deploy directory, deploy any previously built image tag with:

```bash
APP_IMAGE=ghcr.io/xdkaine/portfolio-landing:<commit-sha> docker compose pull app
APP_IMAGE=ghcr.io/xdkaine/portfolio-landing:<commit-sha> docker compose up -d --no-build --remove-orphans
```

The `pgdata` and `public_data` Docker volumes are kept across deploys.