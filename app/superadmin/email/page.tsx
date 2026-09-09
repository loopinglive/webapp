import type { Metadata } from "next";

import { EmailSection } from "@/components/superadmin/EmailSection";

export const metadata: Metadata = { title: "Email · Super admin" };
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <>
      <header className="border-b border-hairline px-6 pb-4 pt-5 lg:px-8">
        <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">Email</h1>
        <p className="mt-0.5 max-w-[70ch] text-[13px] text-ink-muted">
          What the platform sends, and whether it arrived.
        </p>
      </header>
      <EmailSection />
    </>
  );
}
