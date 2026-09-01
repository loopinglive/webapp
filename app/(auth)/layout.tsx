import Link from "next/link";

import { Aurora } from "@/components/ui/aurora";
import { SITE } from "@/lib/constants";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-16">
      <Aurora />
      <div className="relative w-full max-w-[400px]">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2.5 text-[15px] font-semibold tracking-tight"
        >
          <span className="h-2 w-2 rounded-full bg-accent" />
          {SITE.name}
        </Link>
        {children}
      </div>
    </main>
  );
}
