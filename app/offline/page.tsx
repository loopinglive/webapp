import type { Metadata } from "next";

export const metadata: Metadata = { title: "You're offline" };

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-void px-6 text-center text-ink">
      <div>
        <h1 className="text-[22px] font-semibold">You&apos;re offline</h1>
        <p className="mt-2 text-[13.5px] text-ink-muted">
          Check your connection — this page will reload automatically once you&apos;re back.
        </p>
      </div>
    </main>
  );
}
