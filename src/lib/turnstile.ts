const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface TurnstileVerificationResponse {
  success?: boolean;
  "error-codes"?: string[];
  hostname?: string;
}

export interface TurnstileVerificationResult {
  success: boolean;
  errorCodes: string[];
  hostname?: string;
}

export function isTurnstileRequired(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}

export async function verifyTurnstile(
  token: string,
): Promise<TurnstileVerificationResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();

  // If no secret configured, skip verification (dev mode)
  if (!secret) {
    console.warn("[turnstile] No TURNSTILE_SECRET_KEY configured, skipping verification");
    return { success: true, errorCodes: [] };
  }

  try {
    const body = new URLSearchParams({
      secret,
      response: token,
    });

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(5_000),
    });

    const data = (await response.json()) as TurnstileVerificationResponse;
    const errorCodes = Array.isArray(data["error-codes"])
      ? data["error-codes"].filter((code): code is string => typeof code === "string")
      : [];

    if (response.ok && data.success === true) {
      return {
        success: true,
        errorCodes: [],
        hostname: data.hostname,
      };
    }

    console.warn("[turnstile] Verification rejected", {
      status: response.status,
      errorCodes,
      hostname: data.hostname,
    });
    return {
      success: false,
      errorCodes,
      hostname: data.hostname,
    };
  } catch (error) {
    console.error("[turnstile] Verification failed:", error);
    return {
      success: false,
      errorCodes: ["internal-error"],
    };
  }
}
