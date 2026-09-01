import type { AttendeeEvent } from "@/types";

const EVENTS: Record<string, { icon: string; label: (data: Record<string, unknown>) => string }> = {
  registered: { icon: "📝", label: () => "Registered for the webinar" },
  joined_session: { icon: "🟢", label: () => "Joined the webinar" },
  left_session: { icon: "🔴", label: () => "Left the webinar" },
  watch_milestone: {
    icon: "📊",
    label: (data) => `Reached ${data.percent}% of the video`,
  },
  clicked_offer: { icon: "🎯", label: () => "Clicked the offer button" },
  bought: {
    icon: "💰",
    label: (data) =>
      data.manual ? "Marked as purchased by an admin" : "Purchased the offer",
  },
  rejoined: {
    icon: "🔄",
    label: (data) =>
      data.buyer
        ? "Re-registered (buyer — history kept)"
        : "Re-registered (returning attendee)",
  },
  history_cleared: { icon: "🧹", label: () => "Previous history cleared" },
};

export function AttendeeTimeline({ events }: { events: AttendeeEvent[] }) {
  if (!events.length) {
    return (
      <p className="rounded-xl border border-dashed border-[#3A3A4A] px-5 py-12 text-center text-[13px] text-[#A0A0B0]">
        Nothing recorded for this attendee yet.
      </p>
    );
  }

  return (
    <ol className="relative space-y-4 pl-6">
      {/* The line the dots sit on. */}
      <span className="absolute bottom-2 left-[4px] top-2 w-px bg-[#2A2A3A]" />

      {events.map((event) => {
        const meta = EVENTS[event.event_type] ?? {
          icon: "•",
          label: () => event.event_type,
        };
        const data = (event.event_data ?? {}) as Record<string, unknown>;

        return (
          <li key={event.id} className="relative">
            <span className="absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full bg-[#6C47FF] ring-4 ring-[#0A0A0F]" />
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-[13px] text-white">
                <span className="mr-1.5">{meta.icon}</span>
                {meta.label(data)}
              </span>
              <time
                dateTime={event.created_at}
                className="text-[11.5px] tabular-nums text-[#A0A0B0]"
              >
                {new Date(event.created_at).toLocaleString()}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
