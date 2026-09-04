import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  "webinar_template",
  "persona_pack",
  "comment_script",
  "email_sequence",
  "registration_page",
  "offer_page",
  "ai_prompt",
  "webinar_script",
] as const;

const schema = z.object({
  title: z.string().min(3).max(120).trim(),
  description: z.string().min(10).max(5000).trim(),
  category: z.enum(CATEGORIES),
  listingType: z.enum(CATEGORIES),
  price: z.number().min(0),
  thumbnailUrl: z.string().url(),
  previewUrl: z.string().url().optional(),
  demoUrl: z.string().url().optional(),
  tags: z.array(z.string().max(30)).max(8).default([]),
  // What the buyer actually receives, shaped per listing type. Validated
  // loosely here — the shape it needs to be in is decided by
  // apply-template, at the point it is actually used.
  includedItems: z.record(z.string(), z.unknown()),
});

/**
 * Creates a listing, unapproved.
 *
 * `is_approved` starts false and stays false until a super admin reviews it —
 * a marketplace where anything typed straight into it goes live immediately
 * has no defence against spam, plagiarised content, or something that quietly
 * breaks the webinar it gets applied to.
 */
export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the required fields — title, description, category and a thumbnail." },
      { status: 422 }
    );
  }

  // A free listing is priced at exactly 0; anything charged has a $5 floor —
  // below that, Stripe's own processing fee starts to matter more than the
  // sale, and a $1 listing looks like a mistake rather than a product.
  if (parsed.data.price > 0 && parsed.data.price < 5) {
    return NextResponse.json(
      { error: "Price your listing at $0 (free) or at least $5." },
      { status: 422 }
    );
  }

  const supabase = createServiceClient();

  const { data: listing, error } = await supabase
    .from("marketplace_listings")
    .insert({
      seller_id: account.id,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      listing_type: parsed.data.listingType,
      price: parsed.data.price,
      thumbnail_url: parsed.data.thumbnailUrl,
      preview_url: parsed.data.previewUrl || null,
      demo_url: parsed.data.demoUrl || null,
      tags: parsed.data.tags,
      included_items: parsed.data.includedItems as unknown as Json,
      is_approved: false,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ listing });
}
