import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Aurora } from "@/components/ui/aurora";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="relative overflow-hidden px-4 pb-10 pt-24">
      <Aurora className="opacity-60" />

      <div className="relative mx-auto max-w-6xl">
        <div className="glass-strong rounded-panel px-8 py-14 text-center sm:px-16">
          <h2 className="mx-auto max-w-xl text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            Your best webinar, <span className="text-gradient">every night.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[15.5px] leading-relaxed text-ink-muted">
            Record it once. Let it fill rooms while you sleep.
          </p>
          <Link href="/signup" className="mt-8 inline-block">
            <Button size="lg">
              Start free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 text-[12.5px] text-ink-faint sm:flex-row">
          <span>
            © {new Date().getFullYear()} {SITE.name}. {SITE.tagline}
          </span>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="transition-colors hover:text-ink-muted">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-ink-muted">
              Terms
            </Link>
            <Link href="/login" className="transition-colors hover:text-ink-muted">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
