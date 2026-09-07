import type { Metadata } from "next";

import { RevenueForecastDashboard } from "@/components/intelligence/RevenueForecastDashboard";

export const metadata: Metadata = { title: "Revenue Forecast" };

export default function RevenueForecastPage() {
  return <RevenueForecastDashboard />;
}
