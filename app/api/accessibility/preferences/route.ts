import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Reads a signed-in user's accessibility preferences.
 *
 * Signed-out visitors (including webinar attendees, who have no account) keep
 * their preferences in localStorage instead — this route is only what lets a
 * signed-in host's choices follow them across devices.
 */
export async function GET() {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ preferences: null });

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("accessibility_preferences")
    .select("*")
    .eq("user_id", account.id)
    .maybeSingle();

  return NextResponse.json({ preferences: data });
}

const schema = z.object({
  reduce_motion: z.boolean().optional(),
  high_contrast: z.boolean().optional(),
  large_text: z.boolean().optional(),
  screen_reader_optimised: z.boolean().optional(),
  captions_enabled: z.boolean().optional(),
  caption_size: z.enum(["small", "medium", "large", "extra-large"]).optional(),
  caption_background: z.boolean().optional(),
  keyboard_navigation_hints: z.boolean().optional(),
});

export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid preferences." }, { status: 422 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("accessibility_preferences")
    .upsert(
      { user_id: account.id, ...parsed.data, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ preferences: data });
}
