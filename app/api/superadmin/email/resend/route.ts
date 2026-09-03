import { NextResponse } from "next/server";

import { requireSuperAdmin } from "@/lib/billing/account";
import { dispatchMessage } from "@/lib/messaging/dispatch";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Retries one failed message.
 *
 * Resets it to pending and hands it to the normal dispatcher rather than
 * sending directly, so every rule that applies to a scheduled send still
 * applies here -- the recipient may have unsubscribed, bought, or had their
 * channel switched off since it first failed.
 */
export async function POST(request: Request) {
  const { account: admin, response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  if (!id) {
    return NextResponse.json({ error: "A message is required." }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: message } = await supabase
    .from("scheduled_messages")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (!message) {
    return NextResponse.json({ error: "No such message." }, { status: 404 });
  }
  if (message.status === "sent") {
    return NextResponse.json(
      { error: "That message was already delivered." },
      { status: 400 }
    );
  }

  await supabase
    .from("scheduled_messages")
    .update({
      status: "pending",
      error_message: null,
      // Due now, so the dispatcher does not defer it again.
      scheduled_for: new Date().toISOString(),
    })
    .eq("id", id);

  const outcome = await dispatchMessage(supabase, id);

  await supabase.from("admin_actions").insert({
    admin_id: admin.id,
    action: "message_resent",
    detail: { messageId: id, outcome } as never,
  });

  return NextResponse.json({ outcome });
}
