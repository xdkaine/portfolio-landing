import { NextResponse } from "next/server";
import { isTurnstileRequired } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

export function GET() {
  const siteKey =
    process.env.TURNSTILE_SITE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ||
    "";

  return NextResponse.json(
    {
      siteKey,
      required: isTurnstileRequired(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
