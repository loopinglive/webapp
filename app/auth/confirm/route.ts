import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Exchanges an emailed token for a session.
 *
 * The link in our emails points here rather than at Supabase's verify
 * endpoint, so the URL a customer clicks stays on loopinglive.com. Supabase
 * still does the verifying -- verifyOtp checks the token hash -- we just own
 * the address bar and the redirect.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (!tokenHash || !type) {
    redirect("/login?error=invalid_link");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    // Expired and already-used links land here. Both mean "ask for another".
    redirect("/login?error=expired_link");
  }

  // Only relative paths, so a crafted ?next= cannot bounce someone off-site
  // with a freshly minted session.
  redirect(next.startsWith("/") ? next : "/dashboard");
}
