import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Everything held about one registrant, as a file.
 *
 * A subject access request has a deadline, and answering one meant a SQL
 * console. Downloaded rather than rendered: what the person is owed is a copy
 * of their data, and a screen the host has to screenshot is not that.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string; registrantId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId, registrantId } = await params;
  const supabase = createServiceClient();

  // Scoped to this webinar, so a registrant id from elsewhere reads nothing.
  const { data: registrant } = await supabase
    .from("registrants")
    .select("id, full_name, email")
    .eq("id", registrantId)
    .eq("webinar_id", webinarId)
    .maybeSingle();

  if (!registrant) {
    return NextResponse.json({ error: "No such registrant." }, { status: 404 });
  }

  const { data, error } = await supabase.rpc("export_registrant_data", {
    p_registrant_id: registrantId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const safeName =
    registrant.email.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "registrant";

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="loopinglive-data-${safeName}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Erases them.
 *
 * Irreversible, and the confirmation is required in the body rather than left
 * to a dialog — this is the one endpoint in the product that destroys data on
 * purpose, and it should not be reachable from a mistyped fetch.
 *
 * What survives is deliberate and explained in the migration: the sale, as a
 * financial record with its own retention obligations, and the suppression, as
 * a hash — because forgetting that someone asked not to be contacted is not a
 * privacy win.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ webinarId: string; registrantId: string }> }
) {
  const { user, response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId, registrantId } = await params;
  const body = (await request.json().catch(() => ({}))) as { confirm?: boolean };

  if (body.confirm !== true) {
    return NextResponse.json(
      { error: "Erasure has to be confirmed explicitly." },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data: registrant } = await supabase
    .from("registrants")
    .select("id, email")
    .eq("id", registrantId)
    .eq("webinar_id", webinarId)
    .maybeSingle();

  if (!registrant) {
    return NextResponse.json({ error: "No such registrant." }, { status: 404 });
  }

  const { data, error } = await supabase.rpc("erase_registrant", {
    p_registrant_id: registrantId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  /*
   * The audit entry records that an erasure happened, and for which webinar —
   * not who it was. Keeping the address here would put back exactly what was
   * just removed, in a table nobody would think to look in.
   */
  await supabase.from("admin_actions").insert({
    admin_id: user.id,
    action: "registrant_erased",
    detail: { webinarId, result: data } as never,
  });

  return NextResponse.json({ result: data });
}
