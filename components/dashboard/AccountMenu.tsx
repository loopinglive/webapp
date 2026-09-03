"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronUp,
  CreditCard,
  Handshake,
  Loader2,
  LogOut,
  Settings,
  ShieldCheck,
} from "lucide-react";

import { usePlan } from "@/hooks/usePlan";
import { cn } from "@/lib/utils";

const PLAN_COLOUR: Record<string, string> = {
  free: "#6E6E80",
  monthly: "#00D4FF",
  yearly: "#6C47FF",
  lifetime: "#00C851",
};

/**
 * Who you are signed in as, and how to stop being signed in.
 *
 * Sits at the foot of the sidebar because that is where every product this
 * audience already uses puts it.
 */
export function AccountMenu({ className }: { className?: string }) {
  const { fullName, email, planSlug, planName, isAdmin, loading } = usePlan();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape — a menu that traps you is worse
  // than no menu.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } finally {
      // Full navigation, not router.push: every cached server component
      // rendered for the old session has to go, and the router cache would
      // happily serve the signed-in dashboard back.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
    }
  }

  const name = fullName || email || "Your account";
  const initial = (fullName || email || "?").trim().charAt(0).toUpperCase();

  const items = [
    { href: "/settings", label: "Settings", icon: Settings },
    { href: "/settings/billing", label: "Billing", icon: CreditCard },
    { href: "/settings/affiliate", label: "Affiliate", icon: Handshake },
    ...(isAdmin
      ? [{ href: "/superadmin", label: "Super admin", icon: ShieldCheck }]
      : []),
  ];

  return (
    <div ref={container} className={cn("relative px-3", className)}>
      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-3 right-3 z-50 mb-2 overflow-hidden rounded-xl border border-[#23232F] bg-[#12121A] py-1 shadow-[0_20px_50px_-12px_rgba(0,0,0,.8)]"
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-[#A0A0B0] transition-colors hover:bg-white/5 hover:text-white"
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          ))}

          <div className="my-1 border-t border-[#23232F]" />

          <button
            role="menuitem"
            onClick={signOut}
            disabled={signingOut}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] text-[#A0A0B0] transition-colors hover:bg-[#FF5A5A]/10 hover:text-[#FF6B6B] disabled:opacity-50"
          >
            {signingOut ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <LogOut className="h-3.5 w-3.5" />
            )}
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}

      <button
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex w-full items-center gap-2.5 rounded-xl border border-transparent px-2 py-2 text-left transition-colors hover:bg-white/5"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#6C47FF] to-[#00D4FF] text-[13px] font-semibold text-white">
          {loading ? "" : initial}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-white">
            {loading ? "…" : name}
          </span>
          <span
            className="block text-[11px] font-medium capitalize"
            style={{ color: PLAN_COLOUR[planSlug] ?? "#6E6E80" }}
          >
            {loading ? "" : `${planName} plan`}
          </span>
        </span>

        <ChevronUp
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-[#6E6E80] transition-transform",
            !open && "rotate-180"
          )}
        />
      </button>
    </div>
  );
}
