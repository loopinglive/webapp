import type { Metadata } from "next";

export const metadata: Metadata = { title: "You're offline" };

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#0A0A0F] px-6 text-center text-white">
      <div>
        <h1 className="text-[22px] font-semibold">You&apos;re offline</h1>
        <p className="mt-2 text-[13.5px] text-[#A0A0B0]">
          Check your connection — this page will reload automatically once you&apos;re back.
        </p>
      </div>
    </main>
  );
}
