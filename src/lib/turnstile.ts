const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface TurnstileVerificationResponse {
  success?: boolean;
}

export function isTurnstileRequired(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}

export async function verifyTurnstile(
  token: string,
  remoteIp?: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();

  // If no secret configured, skip verification (dev mode)
  if (!secret) {
    console.warn("[turnstile] No TURNSTILE_SECRET_KEY configured, skipping verification");
    return true;
  }

  try {
    const body = new URLSearchParams({
      secret,
      response: token,
    });

    if (remoteIp && remoteIp !== "unknown") {
      body.set("remoteip", remoteIp);
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    const data = (await response.json()) as TurnstileVerificationResponse;
    return response.ok && data.success === true;
  } catch (error) {
    console.error("[turnstile] Verification failed:", error);
    return false;
  }
}
