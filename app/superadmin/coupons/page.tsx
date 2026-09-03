import type { Metadata } from "next";

import { CouponManager } from "@/components/superadmin/CouponManager";

export const metadata: Metadata = { title: "Coupons · Super admin" };

export default function CouponsPage() {
  return (
    <>
      <header className="border-b border-[#1E1E2E] px-6 py-5 lg:px-8">
        <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-white">Coupons</h1>
      </header>
      <CouponManager />
    </>
  );
}
