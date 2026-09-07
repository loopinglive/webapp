import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserAccount } from "@/lib/billing/account";
import { generateForecast } from "@/lib/intelligence/forecasting-engine";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const webinarId = new URL(request.url).searchParams.get("webinarId");
  const supabase = createServiceClient();

  let query = supabase
    .from("revenue_forecasts")
    .select("*")
    .eq("user_id", account.id)
    .order("created_at", { ascending: false })
    .limit(1);

  query = webinarId ? query.eq("webinar_id", webinarId) : query.is("webinar_id", null);

  const { data: latest } = await query.maybeSingle();
  return NextResponse.json({ latest: latest ?? null });
}

const schema = z.object({
  webinarId: z.string().uuid().nullable().optional(),
  periodDays: z.number().int().min(7).max(90).default(30),
});

export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  const supabase = createServiceClient();

  if (parsed.data.webinarId) {
    const { data: owned } = await supabase
      .from("webinars")
      .select("id")
      .eq("id", parsed.data.webinarId)
      .eq("owner_id", account.id)
      .maybeSingle();
    if (!owned) return NextResponse.json({ error: "Webinar not found." }, { status: 404 });
  }

  try {
    const result = await generateForecast(
      supabase,
      account.id,
      parsed.data.webinarId ?? null,
      parsed.data.periodDays
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
