"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Loader2, Plus, X } from "lucide-react";

import { AttendeeMessages } from "@/components/attendees/AttendeeMessages";
import { AttendeeTimeline } from "@/components/attendees/AttendeeTimeline";
import { ManualBoughtToggle } from "@/components/attendees/ManualBoughtToggle";
import { SegmentBadge } from "@/components/attendees/SegmentBadge";
import { WatchDepthBar } from "@/components/attendees/WatchDepthBar";
import { TextArea } from "@/components/admin/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { useAttendeeProfile } from "@/hooks/useAttendeeProfile";
import { cn } from "@/lib/utils";

const MAX_NOTES = 500;

export function AttendeeProfile({
  webinarId,
  registrantId,
}: {
  webinarId: string;
  registrantId: string;
}) {
  const { data, isLoading, error, refetch, save } =
    useAttendeeProfile(registrantId);
  const [notes, setNotes] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="grid h-dvh place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="grid h-dvh place-items-center px-6 text-center">
        <p className="text-[14px] text-[#A0A0B0]">
          {error ?? "This attendee could not be found."}
        </p>
      </div>
    );
  }

  const { attendee, source } = data;
  const tags = (Array.isArray(attendee.tags) ? attendee.tags : []) as string[];
  const noteValue = notes ?? attendee.notes ?? "";

  const copy = (value: string, key: string) => {
    void navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="min-h-dvh">
      <div className="border-b border-[#1E1E2E] px-6 py-4 lg:px-8">
        <Link
          href={`/admin/webinar/${webinarId}/attendees`}
          className="inline-flex items-center gap-2 text-[13px] text-[#A0A0B0] transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to attendees
        </Link>
      </div>

      <div className="grid gap-8 px-6 py-6 lg:grid-cols-[320px_1fr] lg:px-8">
        {/* Summary */}
        <aside className="space-y-5">
          <div className="rounded-xl border border-[#1E1E2E] bg-[#12121A] p-5">
            <Avatar name={attendee.full_name} size={56} />
            <h1 className="mt-4 text-[20px] font-semibold tracking-[-0.02em] text-white">
              {attendee.full_name}
            </h1>
            <div className="mt-2">
              <SegmentBadge segment={data.segment} />
            </div>

            <dl className="mt-5 space-y-2.5 text-[12.5px]">
              <Row label="Email">
                <button
                  onClick={() => copy(attendee.email, "email")}
                  className="flex min-w-0 items-center gap-1.5 text-white transition-colors hover:text-[#6C47FF]"
                >
                  <span className="truncate">{attendee.email}</span>
                  {copied === "email" ? (
                    <Check className="h-3 w-3 shrink-0 text-[#00C851]" />
                  ) : (
                    <Copy className="h-3 w-3 shrink-0 opacity-50" />
                  )}
                </button>
              </Row>

              <Row label="Phone">
                <button
                  onClick={() => copy(attendee.phone, "phone")}
                  className="flex items-center gap-1.5 text-white transition-colors hover:text-[#6C47FF]"
                >
                  <span>{attendee.country_flag}</span>
                  <span>{attendee.phone}</span>
                  {copied === "phone" ? (
                    <Check className="h-3 w-3 text-[#00C851]" />
                  ) : (
                    <Copy className="h-3 w-3 opacity-50" />
                  )}
                </button>
              </Row>

              <Row label="Registered">
                <span className="text-white">
                  {new Date(attendee.created_at).toLocaleString()}
                </span>
              </Row>

              <Row label="Sessions">
                <span className="text-white">
                  {attendee.total_sessions_attended}
                </span>
              </Row>
            </dl>

            <div className="mt-5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A0A0B0]">
                Watch depth
              </span>
              <div className="mt-2">
                <WatchDepthBar
                  percentage={Number(attendee.watch_percentage)}
                  watchSeconds={attendee.watch_seconds}
                  totalSeconds={data.videoDurationSeconds}
                />
              </div>
            </div>

            <dl className="mt-5 space-y-2.5 border-t border-[#1E1E2E] pt-4 text-[12.5px]">
              <Row label="Offer clicked">
                <span className={attendee.clicked_offer ? "text-[#FFD93D]" : "text-[#A0A0B0]"}>
                  {attendee.clicked_offer
                    ? attendee.offer_clicked_at
                      ? new Date(attendee.offer_clicked_at).toLocaleString()
                      : "Yes"
                    : "No"}
                </span>
              </Row>

              <div className="flex items-center justify-between gap-3">
                <dt className="text-[#A0A0B0]">Bought</dt>
                <dd className="flex items-center gap-2">
                  {attendee.bought && attendee.bought_at && (
                    <span className="text-[11.5px] text-[#00C851]">
                      {new Date(attendee.bought_at).toLocaleDateString()}
                    </span>
                  )}
                  <ManualBoughtToggle
                    registrantId={attendee.id}
                    name={attendee.full_name}
                    bought={attendee.bought}
                    onChanged={refetch}
                  />
                </dd>
              </div>
            </dl>
          </div>

          {/* Source */}
          <div className="rounded-xl border border-[#1E1E2E] bg-[#12121A] p-5">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A0A0B0]">
              Where they came from
            </h2>
            {source &&
            (source.utm_source || source.utm_campaign || source.referrer_url) ? (
              <dl className="mt-3 space-y-2 text-[12px]">
                {source.utm_source && <Row label="Source"><span className="text-white">{source.utm_source}</span></Row>}
                {source.utm_medium && <Row label="Medium"><span className="text-white">{source.utm_medium}</span></Row>}
                {source.utm_campaign && <Row label="Campaign"><span className="text-white">{source.utm_campaign}</span></Row>}
                {source.referrer_url && (
                  <Row label="Referrer">
                    <span className="truncate text-white" title={source.referrer_url}>
                      {source.referrer_url}
                    </span>
                  </Row>
                )}
              </dl>
            ) : (
              <p className="mt-2 text-[12px] text-[#A0A0B0]">
                No tracking parameters were on the link they used.
              </p>
            )}
          </div>

          {/* Tags */}
          <div className="rounded-xl border border-[#1E1E2E] bg-[#12121A] p-5">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A0A0B0]">
              Tags
            </h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => void save({ tags: tags.filter((t) => t !== tag) })}
                  className="group inline-flex items-center gap-1 rounded-full bg-[#2A2A3A] px-2.5 py-1 text-[11.5px] text-white transition-colors hover:bg-[#6C47FF]"
                >
                  {tag}
                  <X className="h-2.5 w-2.5 opacity-50 group-hover:opacity-100" />
                </button>
              ))}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                const value = newTag.trim();
                if (!value || tags.includes(value)) return;
                void save({ tags: [...tags, value] });
                setNewTag("");
              }}
              className="mt-3 flex items-center gap-1.5"
            >
              <input
                value={newTag}
                onChange={(event) => setNewTag(event.target.value)}
                placeholder="Hot lead"
                className="h-8 min-w-0 flex-1 rounded-lg border border-[#2A2A3A] bg-[#1A1A2A] px-2.5 text-[12px] text-white placeholder:text-[#A0A0B0]/50 focus:border-[#6C47FF] focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Add tag"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#2A2A3A] text-[#A0A0B0] transition-colors hover:bg-[#6C47FF] hover:text-white"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>

          {/* Notes */}
          <div className="rounded-xl border border-[#1E1E2E] bg-[#12121A] p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A0A0B0]">
                Private notes
              </h2>
              <span
                className={cn(
                  "text-[10.5px] tabular-nums",
                  noteValue.length > MAX_NOTES ? "text-[#FF3B3B]" : "text-[#A0A0B0]"
                )}
              >
                {noteValue.length}/{MAX_NOTES}
              </span>
            </div>
            <TextArea
              rows={4}
              className="mt-2"
              value={noteValue}
              maxLength={MAX_NOTES}
              onChange={(event) => setNotes(event.target.value)}
              onBlur={() => {
                if (notes !== null && notes !== (attendee.notes ?? "")) {
                  void save({ notes });
                }
              }}
              placeholder="Only you can see this."
            />
          </div>
        </aside>

        {/* Activity */}
        <div className="min-w-0 space-y-8">
          <section>
            <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A0A0B0]">
              Activity
            </h2>
            <AttendeeTimeline events={data.events} />
          </section>

          <section>
            <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A0A0B0]">
              Messages sent ({data.messages.length})
            </h2>
            <AttendeeMessages messages={data.messages} />
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="shrink-0 text-[#A0A0B0]">{label}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  );
}
