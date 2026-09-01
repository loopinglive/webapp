import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { getWebinarSetup } from "@/lib/admin-setup";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const payload = await getWebinarSetup(webinarId);

  if (!payload) {
    return NextResponse.json({ error: "Webinar not found" }, { status: 404 });
  }

  return NextResponse.json(payload);
}
