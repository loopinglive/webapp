"use client";

import { useState } from "react";
import { Heart, Loader2 } from "lucide-react";

export function FollowButton({
  creatorId,
  initiallyFollowing,
  followerCount,
}: {
  creatorId: string;
  initiallyFollowing: boolean;
  followerCount: number;
}) {
  const [following, setFollowing] = useState(initiallyFollowing);
  const [count, setCount] = useState(followerCount);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setPending(true);
    setError(null);

    const response = await fetch("/api/creators/follow", {
      method: following ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creatorId }),
    });

    if (response.status === 401) {
      setError("Sign in to follow creators.");
      setPending(false);
      return;
    }
    if (!response.ok) {
      setError("Could not update that.");
      setPending(false);
      return;
    }

    setFollowing((value) => !value);
    setCount((value) => (following ? Math.max(0, value - 1) : value + 1));
    setPending(false);
  }

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <button
        onClick={toggle}
        disabled={pending}
        className={`inline-flex h-10 items-center gap-2 rounded-full px-5 text-[13.5px] font-semibold transition-colors disabled:opacity-50 ${
          following
            ? "border border-hairline text-ink-muted hover:border-[#FF5A5A]/40 hover:text-[#FF5A5A]"
            : "bg-accent text-white hover:bg-accent-soft"
        }`}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Heart className={`h-3.5 w-3.5 ${following ? "fill-current" : ""}`} />
        )}
        {following ? "Following" : "Follow"}
        <span className="tabular-nums opacity-70">{count.toLocaleString()}</span>
      </button>
      {error && <p className="text-[11.5px] text-[#FF6B6B]">{error}</p>}
    </div>
  );
}
