import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserAccount } from "@/lib/billing/account";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  errorType: z.string().max(80).default("render"),
  errorMessage: z.string().min(1).max(2000),
  stackTrace: z.string().max(8000).optional(),
  pageUrl: z.string().max(1000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Client error sink.
 *
 * Rate limited by IP: this endpoint is unauthenticated by necessity (an error
 * can happen before a session resolves), which makes it the obvious thing to
 * flood. A render loop on one browser should not be able to fill the table.
 */
export async function POST(request: Request) {
  const limit = rateLimit(`errors:${clientIp(request)}`, {
    limit: 20,
    windowSeconds: 60,
  });
  if (!limit.ok) return NextResponse.json({ ok: true });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: true });

  const account = await getUserAccount().catch(() => null);

  await createServiceClient()
    .from("error_logs")
    .insert({
      user_id: account?.id ?? null,
      error_type: parsed.data.errorType,
      error_message: parsed.data.errorMessage,
      stack_trace: parsed.data.stackTrace ?? null,
      page_url: parsed.data.pageUrl ?? null,
      user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
      metadata: (parsed.data.metadata ?? {}) as never,
    });

  // Always 200: a client that cannot report an error should not then have to
  // handle an error from the reporter.
  return NextResponse.json({ ok: true });
}
