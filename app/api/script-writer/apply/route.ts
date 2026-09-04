import { NextResponse } from "next/server";
import { z } from "zod";

import { getUserAccount } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const schema = z.object({
  scriptId: z.string().uuid(),
  webinarId: z.string().uuid(),
});

/**
 * Links a finished script to a webinar the same person owns.
 *
 * Only the link — `webinars.script_id` — not the script's words into any of
 * the webinar's own fields. A script is what a host reads while recording;
 * once the video exists, the words already happened, and there is nothing
 * left for this route to write except which script this webinar came from.
 */
export async function POST(request: Request) {
  const account = await getUserAccount();
  if (!account) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 422 });
  }

  const supabase = createServiceClient();

  const [{ data: script }, { data: webinar }] = await Promise.all([
    supabase
      .from("webinar_scripts")
      .select("id, user_id")
      .eq("id", parsed.data.scriptId)
      .maybeSingle(),
    supabase
      .from("webinars")
      .select("id, owner_id")
      .eq("id", parsed.data.webinarId)
      .maybeSingle(),
  ]);

  if (!script || script.user_id !== account.id) {
    return NextResponse.json({ error: "That script does not belong to you." }, { status: 403 });
  }
  if (!webinar || webinar.owner_id !== account.id) {
    return NextResponse.json(
      { error: "That webinar does not belong to you." },
      { status: 403 }
    );
  }

  await supabase
    .from("webinars")
    .update({ script_id: parsed.data.scriptId })
    .eq("id", parsed.data.webinarId);

  await supabase
    .from("webinar_scripts")
    .update({ webinar_id: parsed.data.webinarId, status: "final" })
    .eq("id", parsed.data.scriptId);

  return NextResponse.json({ success: true });
}
