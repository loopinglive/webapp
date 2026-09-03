import type { Metadata } from "next";
import Link from "next/link";

import { ApiDocs } from "@/components/docs/ApiDocs";

export const metadata: Metadata = {
  title: "API documentation",
  description:
    "The Loopinglive REST API — read your webinars, registrants and sessions, and receive signed webhooks for every event.",
};

export default function ApiDocsPage() {
  return (
    <main className="min-h-dvh bg-[#0A0A0F]">
      <header className="sticky top-0 z-30 border-b border-[#1E1E2E] bg-[#0A0A0F]/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1080px] items-center justify-between px-6 py-4">
          <Link href="/" className="text-[14px] font-semibold tracking-[-0.01em] text-white">
            Loopinglive{" "}
            <span className="font-normal text-[#6E6E80]">/ API</span>
          </Link>
          <Link
            href="/settings/api-keys"
            className="rounded-full border border-[#2A2A3A] px-3.5 py-1.5 text-[12.5px] text-[#A0A0B0] transition-colors hover:border-[#6C47FF]/50 hover:text-white"
          >
            Get an API key
          </Link>
        </div>
      </header>

      <ApiDocs />
    </main>
  );
}
