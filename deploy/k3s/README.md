# Portfolio on K3s

Production https://phao.dev runs in namespace `portfolio` on `k3s-01` (172.21.1.90). Cloudflared retains the existing tunnel and forwards to nginx:80. Nginx forwards to app:3000 using cluster DNS. No application NodePort or database port is exposed.

## Data and recovery

PostgreSQL 17 and project uploads, post uploads, and legacy public media use separate retained local PVs under `/srv/portfolio`. These live on the VM disk; declared PV sizes are not disk quotas. Keep the original TrueNAS volumes for rollback. A PostgreSQL custom-format migration dump is stored root-only at `/var/backups/portfolio-migration/source.dump`.

The `resources.json` manifest deliberately starts app and tunnel at zero replicas for restoration. Do not blindly reapply it to a running production deployment: preserve the deployed image and replica counts. Secrets `app-env`, `db-env`, and `tunnel-env` were transferred privately from the original containers. They are never maintained in Git or the runner environment.

For restoration, start PostgreSQL, restore the dump with `pg_restore`, restore all three media directories and permissions, then start the app. Validate database content and every file checksum before enabling the tunnel. Do not restore an old database over newer production writes without a reviewed reconciliation plan.

## Delivery

GitHub-hosted jobs run the existing lint/type/unit/audit/build/E2E checks and publish separate runtime and migration images. The main-only deployment depends on E2E and uses immutable image digests. The repository-specific runner `k3s-portfolio-deploy` is labeled `portfolio-production-deploy` and runs as `portfolio-deploy` through `portfolio-runner.service`.

The runner has no Docker socket or readable cluster credentials. Its only sudo grant is the root-owned `/usr/local/sbin/portfolio-deploy` entrypoint. That helper accepts only two SHA256 digests in this repository and a commit SHA; operations target the portfolio namespace. It takes a PostgreSQL recovery dump, runs a bounded Prisma migration Job, updates the app, and verifies internal/public health and the exact release. Failed app verification restores the prior image. Database migrations are not automatically reversed; use backward-compatible migrations and review destructive schema changes before merging.

The helper and infrastructure manifests require administrator installation; repository pushes cannot replace the root-owned helper. PR jobs never use the production runner. Production environment protections remain in effect.

## Commands

Run inside `ssh k3s-01`:

```sh
sudo kubectl -n portfolio get pods,pvc
sudo systemctl status portfolio-runner
sudo kubectl -n portfolio rollout status deployment/app
sudo kubectl -n portfolio logs deployment/app --tail=50
sudo kubectl -n portfolio get jobs
sudo du -sh /srv/portfolio /var/backups/portfolio-deploy
```

Deployment dumps are local recovery copies, not independent backups, and require storage monitoring/retention management. Scheduled off-VM database and media backups and a restore drill remain follow-up work.
