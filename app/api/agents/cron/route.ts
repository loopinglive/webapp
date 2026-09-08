import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin-auth";
import { dispatchAgents } from "@/lib/agents/dispatch";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Same accepted-callers pattern as the other cron routes: a signed-in admin, or a bearer CRON_SECRET for pg_cron. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorised =
    (secret && request.headers.get("authorization") === `Bearer ${secret}`) || Boolean(await getAdminUser());

  if (!authorised) return NextResponse.json({ error: "Not authorised" }, { status: 401 });

  const result = await dispatchAgents();
  return NextResponse.json(result);
}

export const POST = GET;
