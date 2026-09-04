import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  listingId: z.string().uuid(),
  webinarId: z.string().uuid(),
});

const personaSchema = z.object({
  name: z.string().min(1).max(80),
  avatarUrl: z.string().url().optional(),
  location: z.string().max(80).optional(),
});

const commentSchema = z.object({
  personaName: z.string().min(1),
  content: z.string().min(1).max(500),
  offsetSeconds: z.number().int().min(0),
});

const emailTemplateSchema = z.object({
  templateKey: z.string().min(1),
  triggerType: z.string().min(1),
  channel: z.enum(["email", "sms", "whatsapp"]).default("email"),
  subject: z.string().max(300).optional(),
  body: z.string().min(1),
  delayHours: z.number().min(0).default(0),
});

/**
 * Applies a purchased listing to one of the buyer's own webinars.
 *
 * Ownership of both sides is checked before anything is written: the listing
 * has to be a real purchase, and the webinar has to belong to the person
 * applying it — otherwise a purchased persona pack could be dropped onto a
 * webinar that is not the buyer's to change.
 */
export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  const supabase = createServiceClient();

  const [{ data: purchase }, { data: webinar }] = await Promise.all([
    supabase
      .from("marketplace_purchases")
      .select("id, listing_id")
      .eq("listing_id", parsed.data.listingId)
      .eq("buyer_id", account.id)
      .maybeSingle(),
    supabase
      .from("webinars")
      .select("id, owner_id")
      .eq("id", parsed.data.webinarId)
      .maybeSingle(),
  ]);

  if (!purchase) {
    return NextResponse.json(
      { error: "You have not purchased this listing." },
      { status: 403 }
    );
  }
  if (!webinar || webinar.owner_id !== account.id) {
    return NextResponse.json(
      { error: "That webinar does not belong to you." },
      { status: 403 }
    );
  }

  const { data: listing } = await supabase
    .from("marketplace_listings")
    .select("listing_type, included_items")
    .eq("id", parsed.data.listingId)
    .maybeSingle();

  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

  const content = listing.included_items as Record<string, unknown>;
  const applied: string[] = [];

  const personas = z.array(personaSchema).safeParse(content.personas);
  const comments = z.array(commentSchema).safeParse(content.comments);
  const emails = z.array(emailTemplateSchema).safeParse(content.emailTemplates);

  // Personas first, so comments below can resolve a name to the id just
  // created for it rather than requiring the listing to know ids in advance.
  const nameToId = new Map<string, string>();

  if (
    (listing.listing_type === "persona_pack" || listing.listing_type === "webinar_template") &&
    personas.success &&
    personas.data.length > 0
  ) {
    const { data: created, error } = await supabase
      .from("fake_personas")
      .insert(
        personas.data.map((persona) => ({
          webinar_id: parsed.data.webinarId,
          name: persona.name,
          avatar_url: persona.avatarUrl ?? null,
          location: persona.location ?? null,
        }))
      )
      .select("id, name");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    for (const row of created ?? []) nameToId.set(row.name, row.id);
    applied.push(`${created?.length ?? 0} personas`);
  }

  if (
    (listing.listing_type === "comment_script" || listing.listing_type === "webinar_template") &&
    comments.success &&
    comments.data.length > 0
  ) {
    // A comment script bought on its own has no personas of its own — it
    // resolves against whichever personas the webinar already has, matched
    // by name, and silently skips any it cannot find rather than failing the
    // whole import over one mismatch.
    if (nameToId.size === 0) {
      const { data: existing } = await supabase
        .from("fake_personas")
        .select("id, name")
        .eq("webinar_id", parsed.data.webinarId);
      for (const row of existing ?? []) nameToId.set(row.name, row.id);
    }

    const rows = comments.data
      .map((comment) => {
        const personaId = nameToId.get(comment.personaName);
        return personaId
          ? {
              webinar_id: parsed.data.webinarId,
              persona_id: personaId,
              content: comment.content,
              video_offset_seconds: comment.offsetSeconds,
            }
          : null;
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (rows.length > 0) {
      // Duplicate (persona, timestamp) pairs are skipped rather than failing
      // the batch — the same rule the hand-written comment editor enforces.
      const { error } = await supabase
        .from("timed_comments")
        .upsert(rows, { onConflict: "persona_id,video_offset_seconds", ignoreDuplicates: true });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    applied.push(`${rows.length} timed comments`);
  }

  if (
    (listing.listing_type === "email_sequence" || listing.listing_type === "webinar_template") &&
    emails.success &&
    emails.data.length > 0
  ) {
    const { error } = await supabase.from("message_templates").insert(
      emails.data.map((template) => ({
        webinar_id: parsed.data.webinarId,
        template_key: template.templateKey,
        trigger_type: template.triggerType,
        channel: template.channel,
        subject: template.subject ?? null,
        body: template.body,
        delay_hours: template.delayHours,
        is_active: true,
      }))
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    applied.push(`${emails.data.length} message templates`);
  }

  if (applied.length === 0) {
    return NextResponse.json(
      { error: "Nothing in this listing matched a type this webinar can use." },
      { status: 400 }
    );
  }

  return NextResponse.json({ applied });
}
