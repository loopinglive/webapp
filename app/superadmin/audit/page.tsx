import type { Metadata } from "next";

import { AuditLog } from "@/components/superadmin/AuditLog";

export const metadata: Metadata = { title: "Audit log · Super admin" };
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <>
      <header className="border-b border-hairline px-6 py-5 lg:px-8">
        <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">
          Audit log
        </h1>
        <p className="mt-0.5 max-w-[70ch] text-[13px] text-ink-muted">
          Every admin action and impersonation session, most recent first.
        </p>
      </header>
      <AuditLog />
    </>
  );
}
