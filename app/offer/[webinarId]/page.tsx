import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Check } from "lucide-react";

import { Aurora } from "@/components/ui/aurora";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getOffer(webinarId: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("webinar_offers")
    .select("*")
    .eq("webinar_id", webinarId)
    .eq("is_active", true)
    .eq("offer_type", "internal")
    .limit(1)
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}): Promise<Metadata> {
  const { webinarId } = await params;
  const offer = await getOffer(webinarId);
  return { title: offer?.offer_title ?? "Offer" };
}

/**
 * The host's own sales page, rendered from what they typed in the offer builder.
 *
 * The builder stores plain text, so the shape is inferred here: the first line
 * is the headline, bullet-prefixed lines become the list, and a line that is
 * mostly a price becomes the price. That keeps the editor a single textarea
 * while the output still reads like a page.
 */
export default async function InternalOfferPage({
  params,
}: {
  params: Promise<{ webinarId: string }>;
}) {
  const { webinarId } = await params;
  const offer = await getOffer(webinarId);

  if (!offer) notFound();

  const raw =
    typeof offer.internal_page_content === "string"
      ? offer.internal_page_content
      : "";
  const { headline, bullets, price, paragraphs } = parse(raw);

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#0A0A0F] px-5 py-16">
      <Aurora />

      <article className="relative mx-auto max-w-2xl">
        <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-white sm:text-5xl">
          {headline || offer.offer_title}
        </h1>

        {offer.offer_description && (
          <p className="mt-5 text-pretty text-[16.5px] leading-relaxed text-[#A0A0B0]">
            {offer.offer_description}
          </p>
        )}

        {paragraphs.map((paragraph, index) => (
          <p
            key={index}
            className="mt-4 text-pretty text-[15px] leading-relaxed text-[#A0A0B0]"
          >
            {paragraph}
          </p>
        ))}

        {bullets.length > 0 && (
          <ul className="mt-8 space-y-3">
            {bullets.map((bullet, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#6C47FF]/15">
                  <Check className="h-3 w-3 text-[#6C47FF]" />
                </span>
                <span className="text-[15px] leading-relaxed text-white">
                  {bullet}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-10 rounded-xl border border-white/8 bg-[#12121A]/80 p-7 text-center backdrop-blur-2xl">
          {price && (
            <p className="text-4xl font-semibold tracking-[-0.03em] text-white">
              {price}
            </p>
          )}
          {/* Checkout lands in Phase 7 — until then this is the host's own link. */}
          <p className="mt-4 text-[13px] text-[#A0A0B0]">
            Checkout is not connected yet. Add a Stripe account in billing to take
            payments here.
          </p>
        </div>
      </article>
    </main>
  );
}

function parse(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const bullets: string[] = [];
  const paragraphs: string[] = [];
  let headline = "";
  let price = "";

  for (const line of lines) {
    if (/^[•\-*]\s+/.test(line)) {
      bullets.push(line.replace(/^[•\-*]\s+/, ""));
    } else if (/^[£$€]\s?[\d,]+/.test(line) && line.length < 24) {
      price = line;
    } else if (!headline) {
      headline = line;
    } else {
      paragraphs.push(line);
    }
  }

  return { headline, bullets, price, paragraphs };
}
