import type { Metadata } from "next";

import { CreatorDirectory } from "@/components/creators/CreatorDirectory";
import { Footer } from "@/components/marketing/footer";
import { Nav } from "@/components/marketing/nav";

export const metadata: Metadata = {
  title: "Creators",
  description: "Discover hosts running webinars on Loopinglive.",
};

export default function CreatorsDirectoryPage() {
  return (
    <main className="relative min-h-screen">
      <Nav />
      <div className="mx-auto max-w-5xl px-6 pb-20 pt-28">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
          Creators
        </p>
        <h1 className="mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-[40px]">
          Find hosts worth following
        </h1>
        <p className="mt-3 max-w-[52ch] text-[14.5px] leading-relaxed text-ink-muted">
          Every creator here chose to make their profile public. Follow one and
          you&rsquo;ll hear about their next webinar the moment it&rsquo;s live.
        </p>

        <div className="mt-10">
          <CreatorDirectory />
        </div>
      </div>
      <Footer />
    </main>
  );
}
