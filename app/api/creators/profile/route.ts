import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserAccount } from "@/lib/billing/account";
import { hasPublishedWebinar, isValidHandle } from "@/lib/creators/profile";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("creator_economy_profiles")
    .select("*")
    .eq("user_id", account.id)
    .maybeSingle();

  return NextResponse.json({ profile: data });
}

const schema = z.object({
  creatorHandle: z.string().min(3).max(30),
  bio: z.string().max(500).optional(),
  niche: z.string().max(80).optional(),
  audienceSizeEstimate: z.number().int().min(0).optional(),
  publicProfileEnabled: z.boolean(),
  socialLinks: z
    .object({
      instagram: z.string().url().optional().or(z.literal("")),
      twitter: z.string().url().optional().or(z.literal("")),
      youtube: z.string().url().optional().or(z.literal("")),
      linkedin: z.string().url().optional().or(z.literal("")),
      website: z.string().url().optional().or(z.literal("")),
    })
    .optional(),
});

export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }

  const handle = parsed.data.creatorHandle.toLowerCase().trim();
  if (!isValidHandle(handle)) {
    return NextResponse.json(
      { error: "Handles are 3-30 characters: lowercase letters, numbers, and hyphens." },
      { status: 422 }
    );
  }

  // Rule: a creator with zero published webinars cannot enable a public profile.
  if (parsed.data.publicProfileEnabled && !(await hasPublishedWebinar(account.id))) {
    return NextResponse.json(
      { error: "Publish at least one webinar before making your profile public." },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data: handleTaken } = await supabase
    .from("creator_economy_profiles")
    .select("id")
    .eq("creator_handle", handle)
    .neq("user_id", account.id)
    .maybeSingle();

  if (handleTaken) {
    return NextResponse.json({ error: "That handle is already taken." }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("creator_economy_profiles")
    .upsert(
      {
        user_id: account.id,
        creator_handle: handle,
        bio: parsed.data.bio ?? null,
        niche: parsed.data.niche ?? null,
        audience_size_estimate: parsed.data.audienceSizeEstimate ?? null,
        public_profile_enabled: parsed.data.publicProfileEnabled,
        social_links: parsed.data.socialLinks ?? {},
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
