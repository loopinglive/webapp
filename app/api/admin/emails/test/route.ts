import { NextResponse } from "next/server";

import { requireAnyAdmin } from "@/lib/admin-auth";
import { PLATFORM_EXAMPLE_VARIABLES } from "@/lib/email/example-variables";
import { renderPlatformEmail } from "@/lib/email/platform-templates";
import { configuredChannels, sendEmail } from "@/lib/messaging/providers";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Sends one platform email to the signed-in admin.
 *
 * The recipient is always the admin's own address — never a value from the
 * request — so this cannot be turned into an open relay for arbitrary mail
 * from a verified sending domain.
 */
export async function POST(request: Request) {
  const { user, response: denied } = await requireAnyAdmin();
  if (denied) return denied;

  if (!user.email) {
    return NextResponse.json(
      { error: "Your admin account has no email address." },
      { status: 400 }
    );
  }

  if (!configuredChannels().email) {
    return NextResponse.json(
      { error: "Email is not configured on this deployment." },
      { status: 400 }
    );
  }

  const { key } = (await request.json()) as { key?: string };
  if (!key) {
    return NextResponse.json({ error: "An email key is required." }, { status: 400 });
  }

  let rendered;
  try {
    rendered = renderPlatformEmail(key, PLATFORM_EXAMPLE_VARIABLES, {
      brandName: "Loopinglive",
      unsubscribeLink: PLATFORM_EXAMPLE_VARIABLES.unsubscribe_link,
    });
  } catch {
    return NextResponse.json({ error: "Unknown email." }, { status: 404 });
  }

  const result = await sendEmail({
    to: user.email,
    fromName: "Loopinglive",
    fromEmail:
      process.env.RESEND_FROM_EMAIL?.trim() || "noreply@loopinglive.com",
    subject: `[Test] ${rendered.subject}`,
    html: rendered.html,
    text: rendered.text,
  });

  return result.ok
    ? NextResponse.json({ success: true, sentTo: user.email })
    : NextResponse.json({ error: result.error }, { status: 502 });
}
