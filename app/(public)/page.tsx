import { Faq } from "@/components/marketing/faq";
import { Features } from "@/components/marketing/features";
import { Footer } from "@/components/marketing/footer";
import { Hero } from "@/components/marketing/hero";
import { Nav } from "@/components/marketing/nav";
import { Pricing } from "@/components/marketing/pricing";

export default function Home() {
  return (
    <main className="relative min-h-screen">
      <Nav />
      <Hero />
      <Features />
      <Pricing />
      <Faq />
      <Footer />
    </main>
  );
}
