import Link from "next/link";

export function CtaBanner() {
  return (
    <section className="relative px-4 py-20">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-[#6C47FF] via-[#5A55FF] to-[#00D4FF] px-8 py-16 text-center sm:px-16">
        <h2 className="text-balance text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-white sm:text-[44px]">
          Your webinar is waiting to be built.
        </h2>
        <p className="mx-auto mt-4 max-w-[46ch] text-[16px] leading-relaxed text-white/85">
          Set it up today. Go live tomorrow. Sell forever.
        </p>

        <Link
          href="/signup"
          className="mt-8 inline-flex h-12 items-center rounded-full bg-white px-7 text-[15px] font-semibold text-[#0A0A0F] transition-transform duration-200 hover:scale-[1.02]"
        >
          Start free — no credit card required
        </Link>
      </div>
    </section>
  );
}
