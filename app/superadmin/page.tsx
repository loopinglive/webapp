import type { Metadata } from "next";
import Link from "next/link";

import { RevenueStats } from "@/components/superadmin/RevenueStats";

export const metadata: Metadata = { title: "Super admin" };

export default function SuperAdminHome() {
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#1E1E2E] px-6 py-5 lg:px-8">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-white">
            Platform overview
          </h1>
          <p className="mt-0.5 text-[13px] text-[#A0A0B0]">
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
              className="rounded-full border border-[#2A2A3A] px-3.5 py-1.5 text-[12.5px] text-[#A0A0B0] transition-colors hover:border-[#6C47FF]/50 hover:text-white"
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
