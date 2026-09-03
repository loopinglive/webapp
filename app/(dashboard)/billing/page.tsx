import { redirect } from "next/navigation";

/** Billing moved under settings; keep the old path working. */
export default function LegacyBillingPage() {
  redirect("/settings/billing");
}
