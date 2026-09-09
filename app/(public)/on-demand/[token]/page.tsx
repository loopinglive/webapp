import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { OnDemandPlayer } from "@/components/on-demand/OnDemandPlayer";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function load(token: string) {
  const supabase = createServiceClient();

  const { data: access } = await supabase
    .from("on_demand_access")
    .select("id, webinar_id, registrant_id, expires_at, is_active, first_accessed_at")
    .eq("access_token", token)
    .maybeSingle();

  if (!access || !access.is_active) return null;
  if (access.expires_at && new Date(access.expires_at).getTime() < Date.now()) return null;

  const [{ data: webinar }, { data: registrant }] = await Promise.all([
    supabase
      .from("webinars")
      .select(
        "id, title, description, on_demand_allow_seek, video_duration_seconds, video_public_id, video_url"
      )
      .eq("id", access.webinar_id)
      .maybeSingle(),
    supabase
      .from("registrants")
      .select("id, full_name, watch_percentage")
      .eq("id", access.registrant_id)
      .maybeSingle(),
  ]);

  if (!webinar || !registrant) return null;

  await supabase
    .from("on_demand_access")
    .update({
      ...(access.first_accessed_at ? {} : { first_accessed_at: new Date().toISOString() }),
      last_accessed_at: new Date().toISOString(),
    })
    .eq("id", access.id);

  return { webinar, registrant };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const data = await load(token);
  return { title: data?.webinar.title ?? "Watch on demand" };
}

export default async function OnDemandPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await load(token);
  if (!data) notFound();

  return (
    <main className="min-h-dvh bg-void px-6 py-10 text-ink">
      <div className="mx-auto max-w-5xl">
        <p className="mb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-accent">
          Watch on demand
        </p>
        <h1 className="mb-6 text-[24px] font-semibold tracking-[-0.02em]">{data.webinar.title}</h1>
        <OnDemandPlayer token={token} webinar={data.webinar} registrant={data.registrant} />
      </div>
    </main>
  );
}
