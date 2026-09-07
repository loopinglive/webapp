import { NextResponse } from "next/server";

import { countryFromRequest } from "@/lib/payments/geo";
import { getLocalisedPricing } from "@/lib/payments/pricing";

export const dynamic = "force-dynamic";

/** The lighter-weight check the PPP banner uses: does one apply here, and by how much. */
export async function GET(request: Request) {
  const country = countryFromRequest(request);
  const pricing = await getLocalisedPricing(country);

  if (!pricing || pricing.purchasing_power_parity_factor >= 1) {
    return NextResponse.json({ applies: false });
  }

  return NextResponse.json({
    applies: true,
    countryName: pricing.country_name,
    discountPercent: Math.round((1 - pricing.purchasing_power_parity_factor) * 100),
  });
}
