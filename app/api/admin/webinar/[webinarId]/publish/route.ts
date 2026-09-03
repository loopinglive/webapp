import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { getUserAccount } from "@/lib/billing/account";
import { planPermissions } from "@/lib/billing/plans";
import { getWebinarSetup, isPublishable, missingSteps } from "@/lib/admin-setup";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const { publish } = (await request.json()) as { publish?: boolean };

  const setup = await getWebinarSetup(webinarId);
  if (!setup) {
    return NextResponse.json({ error: "Webinar not found" }, { status: 404 });
  }

  // Plan gate. The upgrade wall in the UI is a courtesy; this is what
  // actually stops a free account going live. Unpublishing is always allowed —
  // nobody should be trapped live because their plan lapsed.
  if (publish) {
    const permissions = planPermissions(await getUserAccount());
    if (!permissions.canPublish) {
      return NextResponse.json(
        {
          error: "Publishing requires a paid plan.",
          upgradeRequired: true,
          planSlug: permissions.planSlug,
        },
        { status: 402 }
      );
    }
  }

  // The disabled button is a courtesy; this is the actual gate.
  if (publish && !isPublishable(setup.checklist)) {
    return NextResponse.json(
      {
        error: "Finish setup before publishing.",
        missing: missingSteps(setup.checklist),
      },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("webinars")
    .update({
      status: publish ? "published" : "draft",
      is_active: Boolean(publish),
      updated_at: new Date().toISOString(),
    })
    .eq("id", webinarId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: publish ? "published" : "draft" });
}
