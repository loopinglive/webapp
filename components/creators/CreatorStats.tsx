import { Star, Users, Video } from "lucide-react";

export function CreatorStats({
  webinarsHosted,
  attendeesServed,
  followerCount,
}: {
  webinarsHosted: number;
  attendeesServed: number;
  followerCount: number;
}) {
  const stats = [
    { icon: Video, label: "webinars hosted", value: webinarsHosted },
    { icon: Users, label: "attendees", value: attendeesServed },
    { icon: Star, label: "followers", value: followerCount },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-ink-muted">
      {stats.map(({ icon: Icon, label, value }) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-ink-faint" />
          <span className="tabular-nums font-medium text-ink">{value.toLocaleString()}</span>
          {label}
        </span>
      ))}
    </div>
  );
}
