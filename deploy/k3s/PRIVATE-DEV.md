# Private development

Push to `dev` to run the same local build and test gates and deploy only the private development environment. `main` continues to deploy production. GitHub keeps source and CI logs; build artifacts remain on the VM-backed NFS storage.

Open https://devops.home.phao.dev on the home network to find the dev sites. Development databases and session secrets are separate from production. External login integrations need development configuration; live payments and game commands are not configured.
