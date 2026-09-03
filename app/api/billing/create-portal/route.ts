import { NextResponse } from "next/server";

import { getUserAccount } from "@/lib/billing/account";
import { billingConfigured, stripe } from "@/lib/billing/stripe";
import { SITE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!billingConfigured()) {
    return NextResponse.json(
      { error: "Billing is not configured on this deployment." },
      { status: 503 }
    );
  }

  const account = await getUserAccount();
  if (!account) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!account.stripe_customer_id) {
    return NextResponse.json(
      { error: "There is no billing account to manage yet." },
      { status: 400 }
    );
  }

  const session = await stripe().billingPortal.sessions.create({
    customer: account.stripe_customer_id,
    return_url: `${SITE.url}/settings/billing`,
  });

  return NextResponse.json({ url: session.url });
}
