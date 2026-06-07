import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { rejectCrossSiteMutation } from "@/lib/requestSecurity";

export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  await destroySession();
  return NextResponse.json({ success: true });
}
