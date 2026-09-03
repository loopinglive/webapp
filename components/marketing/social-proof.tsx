const TESTIMONIALS = [
  {
    quote:
      "I set my webinar up once on a Sunday afternoon. By Wednesday I had made six sales while I was at the gym. This thing is unreal.",
    name: "Marcus T.",
    role: "Business Coach",
  },
  {
    quote:
      "The AI moderators are so good my attendees think they are talking to real people. My show-up rate doubled and my conversion rate tripled.",
    name: "Adaeze O.",
    role: "Course Creator",
  },
  {
    quote:
      "I was spending three hours every week running live webinars. Now I spend thirty minutes setting one up and it runs every day on its own.",
    name: "James K.",
    role: "Digital Marketer",
  },
];

export function SocialProof() {
  return (
    <section className="relative px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-faint">
            Social proof
          </span>
          <h2 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.025em] sm:text-5xl">
            Hosts love Loopinglive
          </h2>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <figure
              key={item.name}
              className="flex flex-col rounded-2xl border border-[#1E1E2E] bg-[#12121A] p-7"
            >
              <blockquote className="flex-1 text-[15px] leading-relaxed text-[#D4D4DE]">
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#6C47FF] to-[#00D4FF] text-[13px] font-semibold text-white">
                  {item.name.charAt(0)}
                </span>
                <span>
                  <span className="block text-[13.5px] font-medium text-white">
                    {item.name}
                  </span>
                  <span className="block text-[12px] text-[#6E6E80]">{item.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
