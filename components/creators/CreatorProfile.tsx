import Link from "next/link";
import { BadgeCheck, Globe } from "lucide-react";

import { CreatorStats } from "@/components/creators/CreatorStats";
import { FollowButton } from "@/components/creators/FollowButton";
import type { PublicCreatorProfile, UpcomingWebinar } from "@/lib/creators/queries";

// This build of lucide-react ships no brand/social icons (trademark reasons
// upstream) — every social link uses the same generic globe glyph, with the
// platform name as the accessible label instead of a recognisable brand mark.

export function CreatorProfile({
  profile,
  upcomingWebinars,
  isFollowing,
  canFollow,
}: {
  profile: PublicCreatorProfile;
  upcomingWebinars: UpcomingWebinar[];
  isFollowing: boolean;
  canFollow: boolean;
}) {
  const socialEntries = Object.entries(profile.social_links).filter(([, url]) => url);

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-accent/15 text-[28px] font-semibold text-accent-soft">
        {profile.full_name.charAt(0).toUpperCase()}
      </div>

      <div className="mt-4 text-center">
        <h1 className="flex items-center justify-center gap-1.5 text-[24px] font-semibold text-ink">
          {profile.full_name}
          {profile.verified && <BadgeCheck className="h-5 w-5 text-accent-soft" />}
        </h1>
        <p className="mt-0.5 text-[13.5px] text-ink-faint">@{profile.creator_handle}</p>
        {profile.niche && (
          <span className="mt-2 inline-block rounded-full bg-white/5 px-3 py-1 text-[11.5px] text-ink-muted">
            {profile.niche}
          </span>
        )}
      </div>

      {profile.bio && (
        <p className="mx-auto mt-4 max-w-md text-center text-[14px] leading-relaxed text-ink-muted">
          {profile.bio}
        </p>
      )}

      <div className="mt-5 flex justify-center">
        <CreatorStats
          webinarsHosted={profile.total_webinars_hosted}
          attendeesServed={profile.total_attendees_served}
          followerCount={profile.follower_count}
        />
      </div>

      {canFollow && (
        <div className="mt-6 flex justify-center">
          <FollowButton creatorId={profile.id} initiallyFollowing={isFollowing} followerCount={profile.follower_count} />
        </div>
      )}

      {socialEntries.length > 0 && (
        <div className="mt-5 flex justify-center gap-3">
          {socialEntries.map(([platform, url]) => (
            <a
              key={platform}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={platform}
              title={platform}
              className="grid h-9 w-9 place-items-center rounded-full border border-hairline text-ink-faint transition-colors hover:text-ink"
            >
              <Globe className="h-4 w-4" />
            </a>
          ))}
        </div>
      )}

      <div className="mt-12">
        <h2 className="text-[14px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
          Upcoming webinars
        </h2>
        {upcomingWebinars.length === 0 ? (
          <p className="mt-3 text-[13.5px] text-ink-faint">Nothing scheduled right now.</p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {upcomingWebinars.map((webinar) => (
              <li key={webinar.id}>
                <Link
                  href={`/webinar/${webinar.id}/register`}
                  className="block rounded-xl border border-hairline bg-surface px-4 py-3.5 transition-colors hover:border-accent/40"
                >
                  <p className="text-[14px] font-medium text-ink">{webinar.title}</p>
                  {webinar.description && (
                    <p className="mt-1 line-clamp-1 text-[12.5px] text-ink-faint">{webinar.description}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
