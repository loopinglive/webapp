"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { useCreatorProfile } from "@/hooks/useCreatorProfile";
import { useToast } from "@/components/ui/ToastProvider";

const SOCIAL_FIELDS = ["instagram", "twitter", "youtube", "linkedin", "website"] as const;

export function CreatorProfileEditor() {
  const { profile, loading, save } = useCreatorProfile();
  const toast = useToast();

  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [niche, setNiche] = useState("");
  const [audienceSize, setAudienceSize] = useState("");
  const [publicEnabled, setPublicEnabled] = useState(false);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    const timer = setTimeout(() => {
      setHandle(profile.creator_handle ?? "");
      setBio(profile.bio ?? "");
      setNiche(profile.niche ?? "");
      setAudienceSize(profile.audience_size_estimate ? String(profile.audience_size_estimate) : "");
      setPublicEnabled(profile.public_profile_enabled);
      setSocialLinks(profile.social_links ?? {});
    }, 0);
    return () => clearTimeout(timer);
  }, [profile]);

  async function submit() {
    setSaving(true);
    setError(null);

    const result = await save({
      creatorHandle: handle,
      bio: bio || undefined,
      niche: niche || undefined,
      audienceSizeEstimate: audienceSize ? Number(audienceSize) : undefined,
      publicProfileEnabled: publicEnabled,
      socialLinks,
    });

    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "Could not save your profile.");
      return;
    }
    toast.success("Profile saved.");
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[12.5px] text-ink-faint">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-5">
      <label className="block">
        <span className="text-[12.5px] text-ink-muted">Handle</span>
        <div className="mt-1.5 flex items-center overflow-hidden rounded-xl border border-hairline bg-surface">
          <span className="pl-3.5 text-[13px] text-ink-faint">loopinglive.com/creators/</span>
          <input
            value={handle}
            onChange={(event) => setHandle(event.target.value.toLowerCase())}
            placeholder="yourname"
            className="h-11 flex-1 bg-transparent px-2 text-[13px] text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </div>
      </label>

      <label className="block">
        <span className="text-[12.5px] text-ink-muted">Bio</span>
        <textarea
          value={bio}
          onChange={(event) => setBio(event.target.value.slice(0, 500))}
          rows={3}
          placeholder="What you host webinars about."
          className="mt-1.5 w-full resize-none rounded-xl border border-hairline bg-surface px-3.5 py-2.5 text-[13px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
        <span className="mt-1 block text-right text-[11px] text-ink-faint">{bio.length}/500</span>
      </label>

      <label className="block">
        <span className="text-[12.5px] text-ink-muted">Niche / speciality</span>
        <input
          value={niche}
          onChange={(event) => setNiche(event.target.value)}
          placeholder="e.g. Business Coaching"
          className="mt-1.5 h-11 w-full rounded-xl border border-hairline bg-surface px-3.5 text-[13px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </label>

      <label className="block">
        <span className="text-[12.5px] text-ink-muted">Audience size estimate (optional)</span>
        <input
          type="number"
          min={0}
          value={audienceSize}
          onChange={(event) => setAudienceSize(event.target.value)}
          className="mt-1.5 h-11 w-full rounded-xl border border-hairline bg-surface px-3.5 text-[13px] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
      </label>

      <div>
        <span className="text-[12.5px] text-ink-muted">Social links</span>
        <div className="mt-1.5 space-y-2">
          {SOCIAL_FIELDS.map((field) => (
            <input
              key={field}
              value={socialLinks[field] ?? ""}
              onChange={(event) => setSocialLinks((current) => ({ ...current, [field]: event.target.value }))}
              placeholder={`https://... (${field})`}
              className="h-10 w-full rounded-xl border border-hairline bg-surface px-3.5 text-[12.5px] text-ink placeholder:text-ink-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
          ))}
        </div>
      </div>

      <label className="flex items-center justify-between rounded-xl border border-hairline bg-surface px-4 py-3.5">
        <span>
          <span className="block text-[13px] text-ink">Public profile</span>
          <span className="mt-0.5 block text-[11.5px] text-ink-faint">
            Listed in the creator directory and reachable at your handle&rsquo;s URL. Requires
            at least one published webinar.
          </span>
        </span>
        <input
          type="checkbox"
          checked={publicEnabled}
          onChange={(event) => setPublicEnabled(event.target.checked)}
          className="h-4 w-4 shrink-0 accent-accent"
        />
      </label>

      {error && <p className="text-[12.5px] text-[#FF6B6B]">{error}</p>}

      <button
        onClick={submit}
        disabled={saving || !handle}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-6 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-soft disabled:opacity-40"
      >
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Save profile
      </button>
    </div>
  );
}
