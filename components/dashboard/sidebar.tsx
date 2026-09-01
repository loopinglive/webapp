"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  Plug,
  Settings,
  Users,
  Video,
  Workflow,
} from "lucide-react";

import { SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/webinars", label: "Webinars", icon: Video },
  { href: "/attendees", label: "Attendees", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/automations", label: "Automations", icon: Workflow },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 flex-col border-r border-white/8 bg-surface/40 px-3 py-5 lg:flex">
      <Link
        href="/dashboard"
        className="mb-7 flex items-center gap-2.5 px-3 text-[15px] font-semibold tracking-tight"
      >
        <span className="h-2 w-2 rounded-full bg-accent" />
        {SITE.name}
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5">
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition-colors duration-200",
                active
                  ? "bg-accent/12 text-ink"
                  : "text-ink-muted hover:bg-white/5 hover:text-ink"
              )}
            >
              <item.icon
                className={cn(
                  "h-[17px] w-[17px]",
                  active ? "text-accent-soft" : "text-ink-faint"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
