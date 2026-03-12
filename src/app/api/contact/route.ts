import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTurnstile } from "@/lib/turnstile";
import { checkRateLimit, getRequestIp } from "@/lib/rateLimit";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const ip = getRequestIp(request);
    const rateLimit = checkRateLimit(`contact:${ip}`, 5, 60 * 60 * 1000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many messages. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const turnstileToken =
      typeof body.turnstileToken === "string" ? body.turnstileToken : "";
    const consent = body.consent === true;
    const company = typeof body.company === "string" ? body.company.trim() : "";

    // Honeypot: silently accept bot submissions without storing.
    if (company) {
      return NextResponse.json({ success: true }, { status: 201 });
    }

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "name, email, and message are required" },
        { status: 400 }
      );
    }

    if (name.length > 120 || email.length > 160 || message.length > 5000) {
      return NextResponse.json(
        { error: "Input exceeds allowed length" },
        { status: 400 },
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    if (!consent) {
      return NextResponse.json(
        { error: "Privacy consent is required" },
        { status: 400 },
      );
    }

    // Verify turnstile
    if (process.env.TURNSTILE_SECRET_KEY) {
      if (!turnstileToken) {
        return NextResponse.json(
          { error: "Verification required" },
          { status: 400 }
        );
      }
      const valid = await verifyTurnstile(turnstileToken);
      if (!valid) {
        return NextResponse.json(
          { error: "Verification failed" },
          { status: 403 }
        );
      }
    }

    const contactMessage = await prisma.contactMessage.create({
      data: { name, email, message },
    });

    return NextResponse.json(
      { success: true, id: contactMessage.id },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

// Protected: list messages (for admin)
export async function GET() {
  // Import here to avoid circular issues
  const { verifySession } = await import("@/lib/auth");

  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const messages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(messages);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
