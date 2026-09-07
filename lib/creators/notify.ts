import "server-only";

import { renderPlatformEmail } from "@/lib/email/platform-templates";
import { sendEmail } from "@/lib/messaging/providers";
import { SITE } from "@/lib/constants";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Emails everyone following a creator when one of their webinars goes live.
 *
 * Fire-and-forget from the publish route — a stalled email provider must
 * never block someone actually publishing their webinar.
 */
export async function notifyFollowersOfNewWebinar(ownerId: string, webinarId: string): Promise<void> {
  try {
    const supabase = createServiceClient();

    const { data: profile } = await supabase
      .from("creator_economy_profiles")
      .select("id, public_profile_enabled")
      .eq("user_id", ownerId)
      .maybeSingle();

    if (!profile?.public_profile_enabled) return;

    const [{ data: webinar }, { data: creatorAccount }, { data: follows }] = await Promise.all([
      supabase.from("webinars").select("title").eq("id", webinarId).maybeSingle(),
      supabase.from("user_accounts").select("full_name").eq("id", ownerId).maybeSingle(),
      supabase.from("creator_follows").select("follower_id").eq("creator_id", profile.id),
    ]);

    if (!webinar || !follows?.length) return;

    const followerIds = follows.map((follow) => follow.follower_id).filter(Boolean) as string[];
    if (!followerIds.length) return;

    const { data: followers } = await supabase
      .from("user_accounts")
      .select("id, full_name, email")
      .in("id", followerIds);

    const creatorName = creatorAccount?.full_name || "A creator you follow";
    const registrationLink = `${SITE.url}/webinar/${webinarId}/register`;

    await Promise.all(
      (followers ?? []).map(async (follower) => {
        try {
          const { subject, html, text } = renderPlatformEmail(
            "creator_new_webinar",
            {
              follower_name: follower.full_name || "there",
              creator_name: creatorName,
              webinar_title: webinar.title,
              registration_link: registrationLink,
            },
            { brandName: "Loopinglive" }
          );

          await sendEmail({
            to: follower.email,
            fromName: "Loopinglive",
            fromEmail: process.env.RESEND_FROM_EMAIL?.trim() || "noreply@loopinglive.com",
            subject,
            html,
            text,
          });
        } catch {
          // One bad address should not stop the rest of the list.
        }
      })
    );
  } catch {
    // Never fails the publish action it is a side-effect of.
  }
}
