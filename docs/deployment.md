# Production deployment

Production runs in the `portfolio` namespace on `k3s-01`, behind the existing Cloudflare tunnel. PostgreSQL, project uploads, post uploads, and legacy media use retained VM-local volumes. The original TrueNAS Compose stack and its runner are stopped.

Current delivery, 23 October 2026: GitHub Actions orchestrates the repository-scoped self-hosted runner on the K3s VM. Rootless Podman builds and regression tests run locally; image archives and caches remain on the VM/NFS. The fixed root-owned importer validates request identity, the current branch head, descriptors and image revisions before invoking the separately installed deployment helper. `main` targets production; `dev` targets the isolated private environment. Database backups, migration checks, image rollback and live health/revision checks remain required. A repository push cannot replace the administrator-owned deployment helpers or their credentials.

Private dev rollout policy: retain one available replica, allow one surge replica, require 15 seconds of stable readiness and delay process shutdown by 10 seconds inside the existing 30-second termination grace period. The administrator-owned [dev rollout policy patch](../deploy/k3s/dev-rollout-policy.patch.json) records these fields; image delivery does not replace them. For an existing pod without a shutdown delay, bootstrap the policy using a held canary and drain the Service route before retiring that old pod. Production's current rollout policy is preserved; assess its availability boundary before any production application update.

See [the K3s operations guide](../deploy/k3s/README.md) for configuration, delivery, and maintenance commands.

## Legacy instructions

[The previous Compose deployment guide](legacy-compose-deployment.md) is historical reference. Do not follow its runner startup or stack deployment instructions for current production. The original volumes are a cutover-time recovery copy; reconcile newer K3s database and media changes before any rollback to Docker.
