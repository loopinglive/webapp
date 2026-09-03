import { NextResponse } from "next/server";
import { z } from "zod";

import { sendPasswordReset } from "@/lib/auth/auth-emails";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const schema = z.object({ email: z.string().email().toLowerCase() });

export async function POST(request: Request) {
  // Tighter than login: a reset endpoint is a mail cannon if left open.
  const limit = rateLimit(`forgot:${clientIp(request)}`, {
    limit: 5,
    windowSeconds: 900,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limit.retryAfter} seconds.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));

  // Always the same answer, whether or not the address exists.
  if (parsed.success) await sendPasswordReset(parsed.data.email);

  return NextResponse.json({ ok: true });
}
