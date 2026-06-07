const DEVELOPMENT_SECRET = "development-only-session-secret-change-me";
const KNOWN_UNSAFE_SECRETS = new Set([
  "fallback-dev-secret-change-me",
  DEVELOPMENT_SECRET,
]);

function requireValue(environment, name) {
  if (!environment[name]?.trim()) {
    throw new Error(`${name} must be configured in production.`);
  }
}

function requireHttpsUrl(environment, name) {
  requireValue(environment, name);
  const value = environment[name].trim();

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.origin !== value.replace(/\/$/, "")) {
      throw new Error();
    }
  } catch {
    throw new Error(`${name} must be an HTTPS origin without a path.`);
  }
}

export function assertJwtSecretConfiguration(
  environment = process.env,
) {
  const secret = environment.JWT_SECRET?.trim();

  if (
    !secret ||
    new TextEncoder().encode(secret).byteLength < 32 ||
    KNOWN_UNSAFE_SECRETS.has(secret)
  ) {
    throw new Error(
      "JWT_SECRET must contain at least 32 random bytes and may not use a known default.",
    );
  }
}

export function assertProductionRuntimeConfiguration(
  environment = process.env,
) {
  if (environment.NODE_ENV !== "production") {
    return;
  }

  assertJwtSecretConfiguration(environment);
  requireValue(environment, "DATABASE_URL");
  requireValue(environment, "TURNSTILE_SECRET_KEY");
  requireValue(environment, "TURNSTILE_SITE_KEY");
  requireHttpsUrl(environment, "NEXT_PUBLIC_SITE_URL");
}

export { DEVELOPMENT_SECRET };
