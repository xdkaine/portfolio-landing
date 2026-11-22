# IdP-managed admin account links

Set `OIDC_ACCOUNT_LINK_MODE=idp` only after importing the portfolio client's
existing broker-subject to local-user mapping into Auth Manager **Account links**
and enabling that exact application. The default is `local`, which retains the
existing `OIDC_ADMIN_BINDINGS` configuration. Keep that mapping for recovery.

Central mode requires signed `app_user_id`, `app_link_version` and
`app_policy_version` claims from the existing pinned issuer. The resulting local
session also binds to this environment's client ID. The callback loads the
existing local user and requires its existing ADMIN role. It creates no account,
changes no role, and performs no email-based linking.

Every authenticated server request checks the genuine provider MFA session and
current mapping evidence through client-authenticated `/session/status`. A
changed/disabled link, old mapping version, wrong client, missing evidence or
IdP outage denies access. Old local-mapping sessions cannot enter central mode.
Restoring a link requires a fresh sign-in; its old version remains invalid.

Validate RTE dev first, then migrate each production application separately.
Before cutover, preserve the live image/configuration and existing user/role
fingerprint. Verify an actual sign-in selects the same user, ADMIN access remains
valid, and disabling/re-enabling the central link does not revive the old
application session. Keep other applications' policies unchanged during each test.

Recovery: retain the original bindings and client credentials. Coordinate
`OIDC_ACCOUNT_LINK_MODE=local` on this application's deployment with disabling
only this client's central policy, then verify sign-in before shared-issuer
recovery. Sign-in can require a retry between those two changes because central
policy intentionally rejects requests without mapping evidence. Public pages
remain available. The old application accounts and roles are retained.
