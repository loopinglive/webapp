import type { Metadata } from "next";

import { CtaBanner } from "@/components/marketing/cta-banner";
import { Faq } from "@/components/marketing/faq";
import { Footer } from "@/components/marketing/footer";
import { Nav } from "@/components/marketing/nav";
import { Pricing } from "@/components/marketing/pricing";

export const metadata: Metadata = {
  title: "Pricing — Loopinglive",
  description:
    "Start free and build your entire webinar. Pay only when you are ready to go live. Monthly, yearly, or lifetime.",
};

export default function PricingPage() {
  return (
    <main className="relative min-h-screen">
      <Nav />
      <div className="pt-16">
        <Pricing />
      </div>
      <Faq />
      <CtaBanner />
      <Footer />
    </main>
  );
}
