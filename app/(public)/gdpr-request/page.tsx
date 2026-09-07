import type { Metadata } from "next";

import { GdprRequestForm } from "@/components/security/GdprRequestForm";
import { Footer } from "@/components/marketing/footer";
import { Nav } from "@/components/marketing/nav";

export const metadata: Metadata = {
  title: "Data Request",
  description: "Ask a Loopinglive host to access, delete, or stop marketing to your data.",
};

export default async function GdprRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ webinarId?: string }>;
}) {
  const { webinarId } = await searchParams;

  return (
    <main className="relative min-h-screen">
      <Nav />
      <div className="mx-auto max-w-[560px] px-6 pb-20 pt-28">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
          Data request
        </p>
        <h1 className="mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink">
          Ask about your data
        </h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-muted">
          If you registered for a webinar on Loopinglive, the host who ran it
          controls your data — we just process it on their instruction. This
          form sends your request straight to them, and they have 30 days to
          respond.
        </p>
        <GdprRequestForm initialWebinarId={webinarId} />
      </div>
      <Footer />
    </main>
  );
}
