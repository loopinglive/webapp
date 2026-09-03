import type { Metadata } from "next";

import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Back shortly · Loopinglive" };
export const dynamic = "force-dynamic";

/**
 * What people see while the site is deliberately down.
 *
 * The message is editable from the admin console, because "back shortly" and
 * "back at 3pm UTC after a database migration" are very different things to
 * read, and only one of them can be written in advance.
 */
export default async function MaintenancePage() {
  let message =
    "We are carrying out planned maintenance and will be back shortly.";

  try {
    const { data } = await createServiceClient().rpc("maintenance_status");
    const status = data as { message?: string } | null;
    if (status?.message) message = status.message;
  } catch {
    // The default above is the right thing to say when the database is the
    // reason we are down.
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[#0A0A0F] px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-[#6C47FF]" />
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-white">
          Back shortly
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-[#A0A0B0]">
          {message}
        </p>
        <p className="mt-6 text-[12px] text-[#4A4A5C]">
          Scheduled sessions and reminders are unaffected.
        </p>
      </div>
    </main>
  );
}
