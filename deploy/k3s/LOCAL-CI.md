# Local CI/CD

Verified 23 October 2026. GitHub provides source, scheduling and job logs/status. Builds, regression tests and deployment run on the dedicated VM runner through the shared single-build queue. Immutable packages remain on NFS; temporary image/context and verified-import staging use guarded `/var/lib/k3s-ci-staging`. Other caches/workspaces have separately managed mounts.

`main` deploys `https://phao.dev` in `portfolio`. The `dev` branch's separate pipeline deploys `https://portfolio-dev.devops.home.phao.dev` in `dev-portfolio`. Development is private and uses separate data and credentials. Other manual branches validate only.

The shared root-owned consumer validates current branch head, checksums, image identity and revision, then calls the installed production or private-dev helper. GitHub Releases/GHCR are not this delivery path; the old `portfolio-pull.timer` is disabled.

Database backups, bounded migration Jobs, retained image rollback and health/revision checks remain required. App rollback does not undo migrations. Root-owned helpers and required mounts are administrator-managed; repository pushes cannot replace them. Failed deployments require review. See [the deployment guide](README.md).
