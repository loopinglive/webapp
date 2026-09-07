import { NextResponse } from "next/server";

import { paystackConfigured } from "@/lib/payments/paystack";
import { flutterwaveConfigured } from "@/lib/payments/flutterwave";
import { mpesaConfigured } from "@/lib/payments/mpesa";
import { razorpayConfigured } from "@/lib/payments/razorpay";
import { countryFromRequest } from "@/lib/payments/geo";
import { getLocalisedPricing } from "@/lib/payments/pricing";

export const dynamic = "force-dynamic";

const CONFIGURED: Record<string, () => boolean> = {
  paystack: paystackConfigured,
  flutterwave: flutterwaveConfigured,
  mpesa: mpesaConfigured,
  razorpay: razorpayConfigured,
  stripe: () => true,
};

/**
 * Which local payment methods are both relevant to this visitor's country
 * and actually have live credentials on this deployment — a method can be
 * geographically right for Nigeria and still absent here if nobody has
 * created a Paystack account yet.
 */
export async function GET(request: Request) {
  const override = new URL(request.url).searchParams.get("country")?.toUpperCase();
  const country = override || countryFromRequest(request);
  const pricing = await getLocalisedPricing(country);

  const candidates = (pricing?.payment_methods as string[] | undefined) ?? ["stripe"];
  const available = candidates.filter((method) => CONFIGURED[method]?.() ?? false);

  return NextResponse.json({
    country,
    methods: available.length ? available : ["stripe"],
  });
}
