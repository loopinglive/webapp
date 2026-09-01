import { createServiceClient } from "@/lib/supabase/server";
import type { MessageChannel } from "@/types/database";
import { appUrl } from "@/lib/messaging/variables";

export const dynamic = "force-dynamic";

const CHANNELS = ["email", "sms", "whatsapp"];

/**
 * One-click opt out, straight from a link in a message.
 *
 * Returns HTML rather than JSON — this is opened by a person in a mail client,
 * not called by code. No confirmation step: an unsubscribe link that asks "are
 * you sure" is a dark pattern, and CAN-SPAM/PECR expect one click.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const registrantId = params.get("registrantId");
  const webinarId = params.get("webinarId");
  const channel = (params.get("channel") ?? "email") as MessageChannel;

  if (!registrantId || !webinarId || !CHANNELS.includes(channel)) {
    return page("That unsubscribe link is not valid.", "");
  }

  const supabase = createServiceClient();

  const { data: registrant } = await supabase
    .from("registrants")
    .select("id, webinar_id")
    .eq("id", registrantId)
    .eq("webinar_id", webinarId)
    .maybeSingle();

  if (!registrant) {
    return page("That unsubscribe link is not valid.", "");
  }

  const { data: webinar } = await supabase
    .from("webinars")
    .select("title")
    .eq("id", webinarId)
    .maybeSingle();

  await supabase
    .from("unsubscribes")
    .upsert(
      { registrant_id: registrantId, webinar_id: webinarId, channel },
      { onConflict: "registrant_id,webinar_id,channel", ignoreDuplicates: true }
    );

  // Nothing further should go out on this channel.
  await supabase
    .from("scheduled_messages")
    .update({ status: "cancelled", error_message: "Recipient unsubscribed" })
    .eq("registrant_id", registrantId)
    .eq("webinar_id", webinarId)
    .eq("channel", channel)
    .eq("status", "pending");

  const label =
    channel === "email" ? "email" : channel === "sms" ? "SMS" : "WhatsApp";

  return page(
    "You have been unsubscribed",
    `You will no longer receive ${label} messages about ${webinar?.title ?? "this webinar"}.`,
    `${appUrl()}/api/automation/unsubscribe?registrantId=${registrantId}&webinarId=${webinarId}&channel=${channel}&resubscribe=1`
  );
}

/** Resubscribe, from the link on the confirmation page. */
export async function POST(request: Request) {
  const { registrantId, webinarId, channel } = (await request.json()) as {
    registrantId?: string;
    webinarId?: string;
    channel?: MessageChannel;
  };

  if (!registrantId || !webinarId || !channel) {
    return Response.json({ error: "Missing parameters" }, { status: 400 });
  }

  const supabase = createServiceClient();
  await supabase
    .from("unsubscribes")
    .delete()
    .eq("registrant_id", registrantId)
    .eq("webinar_id", webinarId)
    .eq("channel", channel as MessageChannel);

  return Response.json({ success: true });
}

function page(title: string, body: string, resubscribeUrl?: string) {
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0A0A0F;color:#fff;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px;">
<div style="max-width:420px;text-align:center;">
  <div style="width:44px;height:44px;margin:0 auto 20px;border-radius:999px;background:rgba(108,71,255,.15);display:grid;place-items:center;color:#6C47FF;font-size:20px;">✓</div>
  <h1 style="margin:0;font-size:24px;letter-spacing:-.02em;">${title}</h1>
  ${body ? `<p style="margin:12px 0 0;color:#A0A0B0;line-height:1.6;font-size:15px;">${body}</p>` : ""}
  ${
    resubscribeUrl
      ? `<p style="margin:28px 0 0;font-size:13px;color:#A0A0B0;">Changed your mind?
      <a href="#" id="r" style="color:#6C47FF;">Resubscribe</a></p>
      <script>document.getElementById('r').onclick=async e=>{e.preventDefault();
      const u=new URL(${JSON.stringify(resubscribeUrl)});
      await fetch(u.pathname,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({registrantId:u.searchParams.get('registrantId'),
      webinarId:u.searchParams.get('webinarId'),channel:u.searchParams.get('channel')})});
      document.getElementById('r').outerHTML='<span style="color:#00C851">Resubscribed</span>';};</script>`
      : ""
  }
</div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
