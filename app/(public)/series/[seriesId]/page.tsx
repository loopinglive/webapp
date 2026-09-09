import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { SeriesRegistration } from "@/components/webinar-series/SeriesRegistration";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function load(seriesId: string) {
  const supabase = createServiceClient();

  const { data: series } = await supabase
    .from("webinar_series")
    .select("id, title, description, is_active")
    .eq("id", seriesId)
    .eq("is_active", true)
    .maybeSingle();

  if (!series) return null;

  const { data: items } = await supabase
    .from("webinar_series_items")
    .select("position, webinar_id")
    .eq("series_id", seriesId)
    .order("position", { ascending: true });

  const webinarIds = (items ?? []).map((item) => item.webinar_id);
  const { data: webinars } = webinarIds.length
    ? await supabase.from("webinars").select("id, title, description").in("id", webinarIds)
    : { data: [] };

  const byId = new Map((webinars ?? []).map((webinar) => [webinar.id, webinar]));

  return {
    series,
    items: (items ?? []).map((item) => ({
      position: item.position,
      webinar: byId.get(item.webinar_id) ?? null,
    })),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ seriesId: string }>;
}): Promise<Metadata> {
  const { seriesId } = await params;
  const data = await load(seriesId);
  return { title: data?.series.title ?? "Webinar series" };
}

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ seriesId: string }>;
}) {
  const { seriesId } = await params;
  const data = await load(seriesId);
  if (!data) notFound();

  const first = data.items[0]?.webinar;
  if (!first) notFound();

  return (
    <main className="min-h-dvh bg-void px-6 py-16 text-ink">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_400px]">
        <div>
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-accent">
            {data.items.length}-part series
          </p>
          <h1 className="text-[32px] font-semibold tracking-[-0.02em]">{data.series.title}</h1>
          {data.series.description && (
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink/60">
              {data.series.description}
            </p>
          )}

          <ol className="mt-8 space-y-3">
            {data.items.map((item, index) => {
              const webinar = item.webinar;
              return (
                <li
                  key={item.position}
                  className="flex items-start gap-3 rounded-xl border border-hairline bg-surface p-4"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent/20 text-[12px] font-semibold text-accent">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-[14px] font-medium text-ink">{webinar?.title}</p>
                    {webinar?.description && (
                      <p className="mt-1 text-[12.5px] text-ink/50">{webinar.description}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="rounded-2xl border border-hairline bg-surface p-6">
          <h2 className="mb-4 text-[16px] font-semibold text-ink">Reserve your spot</h2>
          <SeriesRegistration seriesId={data.series.id} firstWebinarId={first.id} />
        </div>
      </div>
    </main>
  );
}
