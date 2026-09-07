import Link from "next/link";
import { BadgeCheck } from "lucide-react";

import { CreatorStats } from "@/components/creators/CreatorStats";

export type CreatorSummary = {
  id: string;
  creator_handle: string | null;
  full_name: string;
  bio: string | null;
  niche: string | null;
  verified: boolean;
  total_webinars_hosted: number;
  total_attendees_served: number;
  follower_count: number;
};

export function CreatorCard({ creator }: { creator: CreatorSummary }) {
  return (
    <Link
      href={`/creators/${creator.creator_handle}`}
      className="block rounded-2xl border border-hairline bg-surface p-5 transition-colors hover:border-accent/40"
    >
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent/15 text-[15px] font-semibold text-accent-soft">
          {creator.full_name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1 truncate text-[14px] font-semibold text-ink">
            {creator.full_name}
            {creator.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-accent-soft" />}
          </p>
          <p className="truncate text-[12.5px] text-ink-faint">@{creator.creator_handle}</p>
        </div>
      </div>

      {creator.niche && (
        <span className="mt-3 inline-block rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-ink-muted">
          {creator.niche}
        </span>
      )}

      {creator.bio && <p className="mt-2.5 line-clamp-2 text-[12.5px] leading-relaxed text-ink-muted">{creator.bio}</p>}

      <div className="mt-4 border-t border-hairline pt-3">
        <CreatorStats
          webinarsHosted={creator.total_webinars_hosted}
          attendeesServed={creator.total_attendees_served}
          followerCount={creator.follower_count}
        />
      </div>
    </Link>
  );
}
