# Production deployment

Production runs in the `portfolio` namespace on `k3s-01`, behind the existing Cloudflare tunnel. PostgreSQL, project uploads, post uploads, and legacy media use retained VM-local volumes. The original TrueNAS Compose stack and its runner are stopped.

GitHub-hosted Actions publish tested images and release metadata. A systemd timer on the VM pulls approved releases; there are no self-hosted GitHub runners or GitHub credentials on the deployment VM.

See [the K3s operations guide](../deploy/k3s/README.md) for configuration, delivery, and maintenance commands.

## Legacy instructions

[The previous Compose deployment guide](legacy-compose-deployment.md) is historical reference. Do not follow its runner startup or stack deployment instructions for current production. The original volumes are a cutover-time recovery copy; reconcile newer K3s database and media changes before any rollback to Docker.
