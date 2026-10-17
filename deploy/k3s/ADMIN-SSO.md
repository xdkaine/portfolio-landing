# Portfolio admin single sign-on

Public portfolio routes remain anonymous. Only `/v1/login`, `/v1/admin`, and
authenticated CMS APIs use the admin sign-in flow. The existing application
session and local ADMIN role remain the authorization boundary.

## Runtime configuration

Keep these values in the namespace's existing `app-env` Secret, never in source,
build arguments, CI logs, or browser-visible environment variables:

- `ADMIN_AUTH_MODE=oidc`
- `OIDC_CLIENT_ID` and `OIDC_CLIENT_SECRET` for that environment's dedicated client
- `OIDC_ADMIN_BINDINGS`, a JSON object mapping exact auth.edge broker subjects to
  existing local ADMIN user IDs
- `NEXT_PUBLIC_SITE_URL`, the environment's canonical HTTPS origin

The issuer is pinned to `https://auth.edge.phao.dev`. Register exactly
`<canonical-origin>/v1/api/auth/oidc/callback`, with scope `openid profile amr`,
authorization code flow, PKCE S256, and RS256 identity tokens. Use a separate
client for DEV. Do not register wildcard callback URLs or grant access based on
an email address or an identity token's role claim.

Provision or select the local administrator explicitly before configuring its
subject binding. Successful SSO does not create accounts or elevate roles.
Users not present in the binding map are denied even if auth.edge authenticates
them successfully. With SSO enabled, the password endpoint and previous
password-only sessions are rejected.

Login state, nonce, and verifier are stored in a ten-minute encrypted, HTTP-only,
Secure, SameSite=Lax cookie. The maintained `openid-client` library validates the
authorization response, PKCE, issuer, audience, nonce, expiration, and signature.
The callback uses the configured canonical origin instead of incoming Host or
forwarded headers. Alias hosts such as `www.phao.dev` first redirect to the
canonical SSO start endpoint so its host-only cookie returns to the callback.
Application code does not log credentials, authorization codes
or tokens. Review ingress callback-query logging separately when configuring a
production client; application error handling does not control proxy access logs.

Every authenticated admin request also checks the exact client/subject/provider
session against auth.edge `/session/status` with `require_mfa=true`. A revoked
session, removed binding, changed local role, failed verification or unavailable
identity provider denies admin access. Local sessions cannot outlive the provider
session or the existing eight-hour application limit. Local logout removes the
portfolio cookie; it does not sign out unrelated applications at auth.edge.

## Network and rollout

The app requires HTTPS to the existing private auth.edge proxy. Preserve the
canonical hostname and TLS verification, using the established internal address
through an app-only host alias and a destination/port-specific egress policy if
cluster DNS otherwise returns the public bootstrap address. Do not broaden
Internet egress, modify global DNS, or reroute the public portfolio.

Back up the namespace's app deployment, app-env Secret, database, and affected
network policies in a root-only VM directory before configuring it. Save the new
client ID for rollback. Use the Auth Manager's audited internal registry API so
the live provider mirror is updated without restarting unrelated identity users.

Validate public pages, unconfigured/invalid callback failures, rejection of local
password login and prior sessions, and a real owner login with MFA before claiming
live acceptance. Negative protocol checks belong in `src/lib/adminOidc.test.ts`.

DEV deployments remain separate from production. Do not promote the SEO branch
as a side effect of enabling SSO. For rollback, restore the prior DEV deployment
and app-env configuration; preserve current portfolio content. Disable the new
environment-specific client through Auth Manager if retiring the integration.

Protocol implementation reference: [openid-client](https://github.com/panva/openid-client/tree/main/docs).
