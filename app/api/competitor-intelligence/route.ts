import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserAccount } from "@/lib/billing/account";
import { computePriceTrend, type Observation } from "@/lib/intelligence/competitor-intelligence";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: competitors } = await supabase
    .from("competitor_intelligence")
    .select("*")
    .eq("user_id", account.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    competitors: (competitors ?? []).map((competitor) => ({
      ...competitor,
      trend: computePriceTrend((competitor.data_points as unknown as Observation[]) ?? []),
    })),
  });
}

const schema = z.object({
  competitorName: z.string().min(1).max(120).trim(),
  competitorUrl: z.string().url().max(300).nullable().optional(),
});

export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "A competitor name is required." }, { status: 422 });
  }

  const supabase = createServiceClient();
  const { data: competitor, error } = await supabase
    .from("competitor_intelligence")
    .insert({
      user_id: account.id,
      competitor_name: parsed.data.competitorName,
      competitor_url: parsed.data.competitorUrl ?? null,
      data_points: [],
    })
    .select("*")
    .single();

  if (error || !competitor) {
    return NextResponse.json({ error: error?.message ?? "Could not add competitor." }, { status: 500 });
  }

  return NextResponse.json({ competitor });
}
