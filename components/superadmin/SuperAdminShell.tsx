"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  Gauge,
  Megaphone,
  TrendingUp,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/superadmin", label: "Overview", icon: Gauge },
  { href: "/superadmin/users", label: "Users", icon: Users },
  { href: "/superadmin/revenue", label: "Revenue", icon: TrendingUp },
  { href: "/superadmin/coupons", label: "Coupons", icon: BadgePercent },
  { href: "/superadmin/announcements", label: "Announcements", icon: Megaphone },
];

export function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh bg-[#08080C]">
      <aside className="sticky top-0 flex h-dvh w-[220px] shrink-0 flex-col border-r border-[#1E1E2E] bg-[#0B0B12] px-3 py-5">
        <div className="mb-6 px-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#FF5A5A]">
            Super admin
          </p>
          <p className="mt-0.5 text-[15px] font-semibold text-white">Loopinglive</p>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5">
          {ITEMS.map((item) => {
            const active =
              item.href === "/superadmin"
                ? pathname === "/superadmin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border-l-2 px-3 py-2.5 text-[13px] transition-colors",
                  active
                    ? "border-[#FF5A5A] bg-[#FF5A5A]/10 text-white"
                    : "border-transparent text-[#A0A0B0] hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-[#FF5A5A]" : "text-[#A0A0B0]/70"
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/dashboard"
          className="mt-4 border-t border-[#1E1E2E] px-3 pt-4 text-[12.5px] text-[#6E6E80] transition-colors hover:text-white"
        >
          ← Back to my dashboard
        </Link>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
