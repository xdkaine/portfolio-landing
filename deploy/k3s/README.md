# Portfolio on K3s

Production https://phao.dev runs in namespace `portfolio` on `k3s-01` (172.21.1.90). Cloudflared retains the existing tunnel and forwards to nginx:80. Nginx forwards to app:3000 using cluster DNS. No application NodePort or database port is exposed.

## Data and recovery

PostgreSQL 17 and project uploads, post uploads, and legacy public media use separate retained local PVs under `/srv/portfolio`. These live on the VM disk; declared PV sizes are not disk quotas. Keep the original TrueNAS volumes for rollback. A PostgreSQL custom-format migration dump is stored root-only at `/var/backups/portfolio-migration/source.dump`.

The `resources.json` manifest deliberately starts app and tunnel at zero replicas for restoration. Do not blindly reapply it to a running production deployment: preserve the deployed image and replica counts. Secrets `app-env`, `db-env`, and `tunnel-env` were transferred privately from the original containers. They are never maintained in Git or the runner environment.

For restoration, start PostgreSQL, restore the dump with `pg_restore`, restore all three media directories and permissions, then start the app. Validate database content and every file checksum before enabling the tunnel. Do not restore an old database over newer production writes without a reviewed reconciliation plan.

## Delivery

GitHub-hosted Actions run validation, build, E2E tests, and image publication. There are no self-hosted GitHub runners for this repository. The production environment gates publication of a stable GitHub release containing `release.json`, immutable runtime/migration image digests, and the tested commit/run identity. Publication refuses a stale main commit.

On the VM, `portfolio-pull.timer` checks the public release API every two minutes. It requires the expected repository, CI author, tag identity, and asset checksum. It calls the root-owned `/usr/local/sbin/portfolio-deploy` helper; it never downloads or executes scripts from Git. No GitHub token, SSH deployment key, Docker socket, or inbound GitHub connection is required on the VM.

The helper takes a PostgreSQL recovery dump, runs a bounded Prisma migration Job, updates the app, and verifies internal/public health and the exact release. A failed app verification restores the prior image. Database migrations are not automatically reversed: use backward-compatible migrations and review destructive changes before merging.

The puller records applied, failed, or interrupted releases in root-only `/var/lib/portfolio-release/state.json`. Applied releases are not redeployed every poll. Failed/interrupted releases require explicit retry after inspection; changed metadata and older release IDs are rejected. Publish a newly tested release to roll back rather than changing an existing release asset. Keep production releases as the repository's latest stable release.

GitHub Actions waits for the public endpoint to report the new commit before marking delivery successful. The VM journal and migration Job provide the deeper deployment evidence. A publication success alone is not rollout success.

### Administrator installation

From a Linux checkout, install the reviewed scripts and units:

```sh
sudo install -d -m 0700 /var/backups/portfolio-deploy /var/lib/portfolio-release
sudo install -m 0755 deploy/k3s/deploy.py /usr/local/sbin/portfolio-deploy
sudo install -m 0755 deploy/k3s/pull.py /usr/local/sbin/portfolio-pull
sudo install -m 0644 deploy/k3s/portfolio-pull.service deploy/k3s/portfolio-pull.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo /usr/local/sbin/portfolio-pull --check
sudo systemctl enable --now portfolio-pull.timer
```

After verifying a real pull-based deployment, disable the old `portfolio-runner.service`, remove its `/etc/sudoers.d/portfolio-deploy` grant, and unregister the repository's self-hosted runners. The original Docker stack stays stopped. Root-owned helper or infrastructure changes still require administrator installation; ordinary application releases deploy automatically.

## Commands

Run inside `ssh k3s-01`:

```sh
sudo kubectl -n portfolio get pods,pvc
sudo systemctl status portfolio-pull.timer
sudo journalctl -u portfolio-pull.service --since "1 hour ago"
sudo kubectl -n portfolio rollout status deployment/app
sudo kubectl -n portfolio logs deployment/app --tail=50
sudo kubectl -n portfolio get jobs
sudo du -sh /srv/portfolio /var/backups/portfolio-deploy
```

Deployment dumps are local recovery copies, not independent backups, and require storage monitoring/retention management. Scheduled off-VM database and media backups and a restore drill remain follow-up work.

To inspect a published release without deploying:

```sh
sudo /usr/local/sbin/portfolio-pull --check
```

After diagnosing a failed/interrupted release, explicitly retry it while the timer is stopped, then resume polling:

```sh
sudo systemctl stop portfolio-pull.timer
sudo /usr/local/sbin/portfolio-pull --retry
sudo systemctl start portfolio-pull.timer
```

GitHub Actions still uses GitHub-hosted runners for CI. This design removes self-hosted runners; it does not replace GitHub Actions or GHCR.
