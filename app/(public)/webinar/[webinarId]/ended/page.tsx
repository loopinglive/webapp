import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, CalendarClock, Mail } from "lucide-react";

import { Aurora } from "@/components/ui/aurora";
import { LocalTime } from "@/components/webinar/LocalTime";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "The webinar has ended" };
export const dynamic = "force-dynamic";

export default async function ThankYouPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  const supabase = createServiceClient();

  const [{ data: webinar }, { data: upcoming }] = await Promise.all([
    supabase.from("webinars").select("title").eq("id", webinarId).maybeSingle(),
    supabase
      .from("webinar_sessions")
      .select("starts_at")
      .eq("webinar_id", webinarId)
      .gt("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(1),
  ]);

  const nextSession = upcoming?.[0]?.starts_at ?? null;

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-[#0A0A0F] px-5 py-16">
      <Aurora />

      <div className="relative w-full max-w-lg rounded-xl border border-white/8 bg-[#12121A]/80 px-8 py-12 text-center backdrop-blur-2xl">
        <CheckCircle2 className="mx-auto h-10 w-10 text-[#6C47FF]" />

        <h1 className="mt-6 text-balance text-[28px] font-semibold leading-tight tracking-[-0.03em] text-white">
          That&rsquo;s a wrap
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#A0A0B0]">
          Thanks for watching{webinar?.title ? ` ${webinar.title}` : ""}.
        </p>

        <div className="mt-8 space-y-2.5 text-left">
          <Row icon={Mail}>
            Your replay link is on its way by email — it stays open for a limited
            time.
          </Row>
          {nextSession && (
            <Row icon={CalendarClock}>
              The next session runs{" "}
              <LocalTime iso={nextSession} className="text-white" fallback="soon" />.
            </Row>
          )}
        </div>

        {nextSession && (
          <Link
            href={`/webinar/${webinarId}/register`}
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-[#6C47FF] px-7 text-[15px] font-semibold text-white shadow-[0_12px_40px_-10px_#6C47FF] transition-all duration-200 hover:bg-[#7C5AFF] active:scale-[0.99]"
          >
            Save a seat for the next one
          </Link>
        )}
      </div>
    </main>
  );
}

function Row({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#1E1E2E] bg-[#12121A]/60 px-4 py-3.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#6C47FF]" />
      <p className="text-[13.5px] leading-relaxed text-[#A0A0B0]">{children}</p>
    </div>
  );
}
