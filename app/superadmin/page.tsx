import type { Metadata } from "next";
import Link from "next/link";

import { RevenueStats } from "@/components/superadmin/RevenueStats";

export const metadata: Metadata = { title: "Super admin" };

export default function SuperAdminHome() {
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline px-6 py-5 lg:px-8">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">
            Platform overview
          </h1>
          <p className="mt-0.5 text-[13px] text-ink-muted">
            Everything at a glance.
          </p>
        </div>
        <div className="flex gap-2">
          {[
            { href: "/superadmin/users", label: "Manage users" },
            { href: "/superadmin/coupons", label: "Create coupon" },
            { href: "/superadmin/announcements", label: "Post announcement" },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-full border border-surface-3 px-3.5 py-1.5 text-[12.5px] text-ink-muted transition-colors hover:border-accent/50 hover:text-ink"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </header>
      <RevenueStats />
    </>
  );
}
