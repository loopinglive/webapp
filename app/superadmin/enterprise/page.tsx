import type { Metadata } from "next";

import { EnterpriseManager } from "@/components/superadmin/EnterpriseManager";

export const metadata: Metadata = { title: "Enterprise · Super admin" };
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <>
      <header className="border-b border-hairline px-6 py-5 lg:px-8">
        <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">
          Enterprise
        </h1>
        <p className="mt-0.5 max-w-[70ch] text-[13px] text-ink-muted">
          Demo requests from the enterprise landing page, and custom terms for
          accounts that have signed.
        </p>
      </header>
      <EnterpriseManager />
    </>
  );
}
