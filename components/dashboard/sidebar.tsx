"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoMark } from "@/components/brand/Logo";
import { AccountMenu } from "@/components/dashboard/AccountMenu";
import { DASHBOARD_NAV as NAV } from "@/components/dashboard/nav-items";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 flex-col border-r border-hairline bg-surface/40 px-3 py-5 lg:flex">
      <Link
        href="/dashboard"
        className="mb-7 flex items-center gap-2.5 px-3 text-[16px] font-semibold tracking-[-0.02em] text-ink"
      >
        <LogoMark size={30} title={SITE.name} />
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
                  : "text-ink-muted hover:bg-surface-2 hover:text-ink"
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

      <OnboardingChecklist />

      <div className="border-t border-hairline pt-2">
        <div className="flex items-center justify-between gap-2 px-1 pb-2">
          <span className="text-[11px] text-ink-faint">Theme</span>
          <ThemeToggle />
        </div>
        <AccountMenu />
      </div>
    </aside>
  );
}
