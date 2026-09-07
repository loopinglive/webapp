import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";

const TEST_TYPES = [
  "confirmation_message",
  "reminder_subject_line",
  "follow_up_sequence",
  "thank_you_page",
] as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const supabase = createServiceClient();

  const { data: tests } = await supabase
    .from("ab_tests")
    .select("*")
    .eq("webinar_id", webinarId)
    .order("created_at", { ascending: false });

  return NextResponse.json({ tests: tests ?? [] });
}

const schema = z.object({
  name: z.string().min(1).max(120).trim(),
  description: z.string().max(500).trim().nullable().optional(),
  testType: z.enum(TEST_TYPES),
  variantA: z.record(z.string(), z.unknown()),
  variantB: z.record(z.string(), z.unknown()),
  trafficSplit: z.number().int().min(1).max(99).default(50),
});

/**
 * A test is scoped to lifecycle content a registrant sees after they already
 * exist as a row — the confirmation message, a reminder's subject line, the
 * follow-up sequence, the thank-you page — not the registration form itself.
 * Bucketing needs a stable identifier to be deterministic, and this platform
 * has no anonymous-visitor tracking to bucket someone before they register.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid test." }, { status: 422 });
  }

  const supabase = createServiceClient();
  const { data: test, error } = await supabase
    .from("ab_tests")
    .insert({
      webinar_id: webinarId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      test_type: parsed.data.testType,
      variant_a: parsed.data.variantA as Json,
      variant_b: parsed.data.variantB as Json,
      traffic_split: parsed.data.trafficSplit,
    })
    .select("*")
    .single();

  if (error || !test) {
    return NextResponse.json({ error: error?.message ?? "Could not create test." }, { status: 500 });
  }

  return NextResponse.json({ test });
}
