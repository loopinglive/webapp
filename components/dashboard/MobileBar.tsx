"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { AccountMenu } from "@/components/dashboard/AccountMenu";
import { DASHBOARD_NAV } from "@/components/dashboard/nav-items";
import { SITE } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Navigation below the large breakpoint.
 *
 * The sidebar is `hidden lg:flex`, so without this the dashboard has no
 * navigation at all on a phone — and, until now, no way to sign out.
 */
export function MobileBar() {
  const pathname = usePathname();

  // The drawer remembers which page it was opened on, so any navigation —
  // including a back gesture — closes it during render. Deriving this beats
  // an effect that closes it after the new page has already appeared behind.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const setOpen = (next: boolean) => setOpenedOn(next ? pathname : null);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-hairline bg-void/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/dashboard" className="text-[15px] font-semibold tracking-[-0.02em] text-ink">
          {SITE.name}
        </Link>

        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          // 44px minimum touch target.
          className="ml-auto grid h-11 w-11 place-items-center rounded-xl text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70"
          />

          <div className="absolute inset-y-0 right-0 flex w-[min(300px,85vw)] flex-col border-l border-hairline bg-void">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                Menu
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="grid h-11 w-11 place-items-center rounded-xl text-ink-muted hover:bg-surface-2 hover:text-ink"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-3">
              {DASHBOARD_NAV.map((item) => {
                const active =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14px] transition-colors",
                      active
                        ? "bg-accent/12 text-ink"
                        : "text-ink-muted hover:bg-surface-2 hover:text-ink"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-[18px] w-[18px]",
                        active ? "text-accent-soft" : "text-ink-faint"
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-hairline py-2">
              <AccountMenu />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
