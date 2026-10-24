# Portfolio on K3s

Verified 23 October 2026. Production `https://phao.dev` runs in namespace `portfolio` on `k3s-01`. Its existing Cloudflare tunnel forwards through Nginx to the app. Private development is `https://portfolio-dev.devops.home.phao.dev` in `dev-portfolio`, through the existing NPM/home/VPN policy, with separate data and credentials.

## Delivery

GitHub Actions schedules builds on the dedicated, unprivileged `portfolio-local` VM runner. The shared build queue serializes work. The `main` workflow deploys production; the `dev` branch carries the separate private-development pipeline. Other manual branches validate only. CI retains its type, lint, unit, helper, dependency audit and browser gates.

Tested runtime/migration images and checksum metadata remain under `/srv/ci-artifacts/portfolio/releases/<branch>/<revision>` on NFS. No image, GitHub Release, Actions artifact or build cache is published. Temporary image/context and verified-import staging use guarded `/var/lib/k3s-ci-staging`; other cache/workspace mounts are separately managed.

`submit-local.py` waits for the receipt for its individual submission. `k3s-local-portfolio.path` activates the root-owned shared consumer, which checks branch head, checksums, image identity and source revision. It invokes `/usr/local/sbin/portfolio-deploy` for production or `/usr/local/sbin/private-dev-portfolio` for development. These helpers remain administrator-managed and are not replaced by app pushes.

The helper backs up the target database, runs a bounded migration Job outside the app Service selector, rolls out the image and verifies health/revision. App rollback does not undo migrations. Keep schema changes compatible with retained images; failed migrations require review.

`portfolio-pull.timer` and the old GitHub-release poller are retired and disabled. Historical polling scripts/units remain for reference. Do not re-enable them, unregister the current runner, or replay their old installer instructions.

## Data and recovery

Production PostgreSQL and media retain their existing volumes under `/srv/portfolio`; private dev has separate storage. Preserve runtime Secrets and file ownership. Declared PV capacity is not a filesystem quota. The checked-in restoration manifest starts selected workloads at zero replicas: do not reapply it blindly over a live deployment.

Production deployment dumps are under `/var/backups/portfolio-deploy`. Development recovery uses its administrator-managed dev storage. Dumps are recovery copies, not proof of independent backup or restore acceptance. Restore only with a reviewed plan that accounts for later writes, media consistency and current ownership.

Before changing root-owned helpers, compare reviewed source with installed files, preserve exact recovery copies, test on Linux and wait for idle deployment locks. Install atomically and verify both environments. Application releases use ordinary branch pushes.

## Operations

Inside `ssh k3s-01`:

```sh
sudo systemctl status k3s-local-portfolio.path k3s-ci-portfolio.service
sudo journalctl -u k3s-local-portfolio.service --since '1 hour ago'
sudo cat /var/lib/k3s-local-ci/portfolio-main.json
sudo cat /var/lib/k3s-local-ci/portfolio-dev.json
sudo k3s kubectl -n portfolio get deploy,pods,jobs
sudo k3s kubectl -n dev-portfolio get deploy,pods,jobs
```

Verify the expected revision and readiness, not only a completed build. Inspect failed/blocked consumer state before retrying; do not clear markers or restore an old database automatically. See [local CI details](LOCAL-CI.md).
