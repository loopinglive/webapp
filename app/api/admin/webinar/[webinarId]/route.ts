import { NextResponse } from "next/server";
import { requireWebinarAccess } from "@/lib/webinar-access";

import { getWebinarSetup } from "@/lib/admin-setup";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { webinarId } = await params;
  const access = await requireWebinarAccess(webinarId);
  if (!access.ok) return access.response;
  const payload = await getWebinarSetup(webinarId);

  if (!payload) {
    return NextResponse.json({ error: "Webinar not found" }, { status: 404 });
  }

  return NextResponse.json(payload);
}
