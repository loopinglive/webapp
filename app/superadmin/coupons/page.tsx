import type { Metadata } from "next";

import { CouponManager } from "@/components/superadmin/CouponManager";

export const metadata: Metadata = { title: "Coupons · Super admin" };

export default function CouponsPage() {
  return (
    <>
      <header className="border-b border-hairline px-6 py-5 lg:px-8">
        <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">Coupons</h1>
      </header>
      <CouponManager />
    </>
  );
}
