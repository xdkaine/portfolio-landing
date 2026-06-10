import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { isTurnstileRequired, verifyTurnstile } from "@/lib/turnstile";
import { checkRateLimit, getRequestIp } from "@/lib/rateLimit";
import { rejectCrossSiteMutation } from "@/lib/requestSecurity";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const rejected = rejectCrossSiteMutation(request);
    if (rejected) return rejected;

    const ip = getRequestIp(request);
    const rateLimit = checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const turnstileToken =
      typeof body.turnstileToken === "string" ? body.turnstileToken.trim() : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }
    if (
      email.length > 160 ||
      password.length > 1_024 ||
      turnstileToken.length > 4_096
    ) {
      return NextResponse.json(
        { error: "Login input exceeds allowed length" },
        { status: 400 },
      );
    }

    const accountRateLimit = checkRateLimit(
      `login-account:${email.toLowerCase()}`,
      20,
      15 * 60 * 1000,
    );
    if (!accountRateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(accountRateLimit.retryAfterSeconds),
          },
        },
      );
    }

    if (isTurnstileRequired()) {
      if (!turnstileToken) {
        return NextResponse.json(
          { error: "Verification required" },
          { status: 400 }
        );
      }

      const verification = await verifyTurnstile(turnstileToken);
      if (!verification.success) {
        return NextResponse.json(
          {
            error: "Verification failed",
            verificationCode: verification.errorCodes[0] ?? "unknown-error",
          },
          { status: 403 }
        );
      }
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    await createSession(user.id, user.role);

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    console.error("Login route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
