# Local CI/CD

GitHub supplies code and job logs/status. Builds, regression tests and deployments run on the VM in the shared single-build queue. Packages and npm/browser caches stay on NFS; active image layers and these runners' workspaces use the rebuildable ext4 scratch file backed by NFS. The 50 GiB VM disk is unchanged. No image, Release, Actions artifact or build cache is uploaded to GitHub.

Main deploys phao.dev. There is no dev deployment. Database backup, bounded migration job and public revision checks remain required.

Root-owned deployment helpers and the NFS scratch mount are administrator-managed. Failed deployments require review; application rollback does not reverse database migrations. A missing NFS mount prevents new builds while existing applications retain their current storage.
