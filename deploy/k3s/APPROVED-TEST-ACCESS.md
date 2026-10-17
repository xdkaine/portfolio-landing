# Owner-approved portfolio verification

This optional feature provides a ten-minute verification session after the owner explicitly approves a request on another device. It uses the existing auth.edge OIDC client and identity binding. It does not register an automation identity, copy an owner password, or replace normal admin authentication.

The requesting browser opens `/v1/test-access`, creates a request, and displays an eight-character comparison code and approval URL. The owner opens that URL on their own device, completes a fresh auth.edge sign-in, compares the code, and chooses Approve or Deny. The requester then checks approval and opens `/v1/test-access/verify`.

The verification screen reports an active owner-approved MFA session, the running release, and public project/published-post counts. Its separate encrypted cookie is not accepted by the CMS or normal admin session verification. It cannot edit content, open private settings or read contact messages. Public pages stay anonymous. This is delegated verification access; it does not prove that a separate automation identity completed an interactive OIDC login.

## Controls

- Disabled by default. Requires `ENABLE_APPROVED_TEST_SESSIONS=true` and existing OIDC mode. Enable in DEV first; production activation is a separate release/configuration decision.
- The additive `test_access_grants` migration stores only request/audit state, a hashed browser proof, and a temporarily encrypted provider identity. No owner password, access token or refresh token is stored there.
- Request proofs and verification cookies are HTTP-only, Secure and SameSite=Lax. Mutations require the exact configured Origin, and cross-site requests fail closed. Request creation and polling are rate limited.
- The OAuth transaction seals the approval request ID and uses the existing PKCE/state/nonce checks. Approval logins request `prompt=login` and `max_age=300`; the signed ID token must contain recent `auth_time`.
- A five-minute encrypted owner receipt binds the approval screen to that exact request, approved local identity, and current owner SSO cookie. GET never approves access; the owner must submit an explicit decision.
- Requests expire after ten minutes. Approved access lasts at most ten minutes and cannot exceed the provider session lifetime. Redemption uses an atomic conditional database update, so concurrent requests and replays cannot create additional sessions. Temporary provider ciphertext is cleared on redemption.
- Each verification request checks the grant, existing ADMIN role, configured identity mapping, and live auth.edge MFA session. Owner revocation and provider revocation end access. Logging out revokes the verification grant and clears its separate cookies.
- Approval links and codes are request identifiers, not login credentials. The owner should approve only a request they initiated and whose code matches their current agent request.

## Validation and recovery

Unit tests exercise real encryption and signed OIDC exchanges, wrong-browser proofs, tampering, purpose substitution, invalid return destinations, missing/stale authentication times, expiry limits, and denied/revoked/consumed requests. An isolated PostgreSQL test verifies one successful redemption from eight concurrent attempts. The default CI browser test verifies that every feature route is disabled without explicit activation.

Before enabling a DEV canary, test the real two-device approval, denial, revocation and expiration flows; confirm that no CMS endpoint accepts the verification cookie and that normal owner admin SSO/login/logout still works. Preserve current application/Secret revisions and a database recovery point. Disabling the feature flag immediately closes its routes and verification sessions without changing normal SSO. Roll back the app image if required; retain the additive audit table rather than restoring an old content database.

Pending/expired audit rows are retained; no cleanup timer is installed by this feature. Monitor growth and define retention before broad production use. This first version is limited to the portfolio; other services need their own scoped integration and review.
