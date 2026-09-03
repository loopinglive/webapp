import Link from "next/link";

import { Footer } from "@/components/marketing/footer";
import { Nav } from "@/components/marketing/nav";

export type LegalSection = {
  id: string;
  heading: string;
  body: React.ReactNode;
};

/**
 * Shared shell for Terms and Privacy.
 *
 * Same navigation and footer as the marketing site, a contents list that
 * anchors into the document, and print styles — people do print these, and a
 * dark page prints as a solid black rectangle without them.
 */
export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: React.ReactNode;
  sections: LegalSection[];
}) {
  return (
    <main className="relative min-h-screen">
      <Nav />

      <article className="mx-auto max-w-[760px] px-6 pb-20 pt-28">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6C47FF]">
          Legal
        </p>
        <h1 className="mt-3 text-[38px] font-semibold leading-[1.1] tracking-[-0.03em] text-white">
          {title}
        </h1>
        <p className="mt-3 text-[13px] text-[#6E6E80]">Last updated {updated}</p>

        <div className="mt-6 text-[15px] leading-relaxed text-[#A0A0B0]">{intro}</div>

        <nav
          aria-label="Contents"
          className="mt-10 rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-5 print:hidden"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6E6E80]">
            Contents
          </p>
          <ol className="mt-3 space-y-1.5">
            {sections.map((section, index) => (
              <li key={section.id} className="flex gap-2.5 text-[13.5px]">
                <span className="tabular-nums text-[#4A4A5C]">{index + 1}.</span>
                <a
                  href={`#${section.id}`}
                  className="text-[#A0A0B0] transition-colors hover:text-white"
                >
                  {section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-12 space-y-10">
          {sections.map((section, index) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-white">
                <span className="mr-2 tabular-nums text-[#4A4A5C]">{index + 1}.</span>
                {section.heading}
              </h2>
              <div className="mt-3 space-y-3 text-[14.5px] leading-relaxed text-[#A0A0B0] [&_a]:text-[#6C47FF] [&_a:hover]:text-[#8A6BFF] [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-[#D4D4DE]">
                {section.body}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-14 border-t border-[#1E1E2E] pt-6 text-[13.5px] text-[#6E6E80]">
          Questions about this document? Email{" "}
          <a href="mailto:support@loopinglive.com" className="text-[#6C47FF]">
            support@loopinglive.com
          </a>
          . See also our{" "}
          <Link href="/terms" className="text-[#6C47FF]">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-[#6C47FF]">
            Privacy Policy
          </Link>
          .
        </p>
      </article>

      <Footer />
    </main>
  );
}
