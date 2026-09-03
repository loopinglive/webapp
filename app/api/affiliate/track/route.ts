import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Records a referral click as a cookie.
 *
 * Thirty days, matching the attribution window. Lax rather than None so the
 * cookie survives the click-through from an affiliate's own site.
 */
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("ref")?.trim() ?? "";

  if (!/^[a-z0-9]{4,32}$/i.test(code)) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("loopinglive_ref", code, {
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    httpOnly: false,
  });
  return response;
}
