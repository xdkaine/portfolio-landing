# Owner-approved actual admin sessions

This optional feature opens the real `/v1/admin` CMS in the requesting browser after the owner explicitly approves full admin access on another device. It uses the existing auth.edge client, existing mapped ADMIN account and current MFA session. It creates no automation account and shares no owner password, passkey, authenticator code, access token or refresh token.

## Flow and permissions

1. The requester uses the approved-admin link on the SSO login screen, or opens `/v1/test-access`, and creates a request.
2. The owner opens the displayed URL on their phone or another browser (the requesting browser is rejected before owner SSO), completes fresh auth.edge SSO, compares the eight-character code, and reads the **full CMS permissions** notice before choosing Approve or Deny. Full access includes private settings/messages and creating, editing and deleting content; it is not a read-only verification grant.
3. The same requesting browser checks approval and opens the actual admin dashboard. A banner shows the remaining time and an End button. The previous `/v1/test-access/verify` bookmark redirects to the real admin.
4. The owner can revoke from their approval page. Either the normal admin Logout button or End this admin test session revokes the grant and removes the requester cookie. Neither ends the owner's central auth.edge session.

Every CMS page is protected by the admin server layout. Every CMS API uses the same `verifySession()` authorization path. A delegated session rechecks its database grant, explicit scope, prior one-time consumption, expiry, current ADMIN role, current subject binding and live provider MFA on every request. Already displayed data cannot be withdrawn, but revocation rejects subsequent protected requests. A delegated session cannot approve further sessions: approval requires the normal owner's SSO cookie and a fresh receipt bound to the exact request and cookie.

## Activation and legacy safety

- Disabled by default. Requires **`ENABLE_APPROVED_ADMIN_SESSIONS=true`** and existing `ADMIN_AUTH_MODE=oidc`. The former `ENABLE_APPROVED_TEST_SESSIONS` flag does not enable admin access.
- Enable in DEV first with protected configuration/database backups. Production deployment or activation is a separate decision.
- The additive migration adds a scope column whose default is the old `portfolio:verify` value. New requests explicitly use `portfolio:admin:test`. Old pending or approved verification rows and old verification cookies can never become admin permissions. Audit rows are retained.
- The new encrypted `admin-session` token has its own key purpose/audience and scope. It is accepted only by the grant-aware CMS validator; it is never treated as a normal owner JWT. The normal eight-hour owner login remains unchanged. Redemption clears any normal owner cookie in the requesting browser so it cannot outlive the short grant; it never clears the owner's cookies on the separate approval device. Browser separation is checked by possession of the request proof, not by hardware attestation.
- Requests expire after ten minutes. Approved sessions last at most ten minutes from approval, clipped to provider expiry. Cookies are HTTP-only, Secure, SameSite=Lax and host-only. Their secrets never appear in a URL or client JavaScript.
- PKCE/state/nonce and recent signed `auth_time` checks remain mandatory. Owner approval requires `prompt=login`, `max_age=300`, a five-minute receipt bound to request/user/current owner JWT, and an explicit POST. GET never grants access.
- Exact Origin checks, cross-site rejection, request/poll rate limits, hashed requester proofs, atomic one-time redemption and clearing temporary identity ciphertext remain in place.

## Acceptance and recovery

CI covers real cryptography and signed OIDC exchanges; it rejects legacy scope/token substitution, inactive/revoked/unconsumed grants, stale role/binding/MFA, overlong expiry, missing/stale owner authentication and wrong-browser/replayed redemption. The default-off browser regression verifies every approval route is unavailable unless explicitly enabled.

After DEV CI succeeds, activate only the new DEV flag. Verify anonymous admin/API protection and public access; obtain a fresh human approval for the new full-admin scope. Test the actual dashboard, project/post navigation and logout, and confirm the grant is revoked and protected routes require login again. Use disposable DEV records if editing tests are separately needed; preserve existing content and avoid opening private credential fields or messages during the login/navigation test.

Disabling the new flag immediately denies delegated CMS authorization while normal owner SSO keeps working. Preserve additive audit rows on rollback; do not restore an old content database just to remove this feature. No cleanup timer is installed: monitor audit growth and define retention before broad production use. This integration grants access only to this portfolio, not other auth.edge applications.
