import type { Metadata } from "next";

import { AnnouncementManager } from "@/components/superadmin/AnnouncementManager";

export const metadata: Metadata = { title: "Announcements · Super admin" };

export default function AnnouncementsPage() {
  return (
    <>
      <header className="border-b border-[#1E1E2E] px-6 py-5 lg:px-8">
        <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-white">
          Announcements
        </h1>
      </header>
      <AnnouncementManager />
    </>
  );
}
