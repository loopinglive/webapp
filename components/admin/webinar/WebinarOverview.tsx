"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Loader2, X } from "lucide-react";

import { AdminButton, TextInput } from "@/components/admin/ui/Field";
import { VideoPreview } from "@/components/admin/webinar/VideoPreview";
import { WebinarStatusBadge } from "@/components/admin/webinar/WebinarStatusBadge";
import {
  SectionHeader,
  useSetupContext,
} from "@/components/admin/webinar/WebinarSetupShell";
import { cn } from "@/lib/utils";
import type { SetupChecklist } from "@/types";

const ITEMS: {
  key: keyof SetupChecklist;
  label: string;
  href: string;
  optional?: boolean;
}[] = [
  { key: "video", label: "Video uploaded", href: "/settings" },
  { key: "schedule", label: "At least one schedule set", href: "/schedule" },
  { key: "personas", label: "At least one fake persona", href: "/personas" },
  { key: "comments", label: "At least 5 timed comments", href: "/comments" },
  { key: "offer", label: "Offer configured", href: "/offer" },
  { key: "ai", label: "AI moderators configured", href: "/ai" },
  {
    key: "engagement",
    label: "Engagement items added",
    href: "/engagement",
    optional: true,
  },
];

export function WebinarOverview({ webinarId }: { webinarId: string }) {
  const router = useRouter();
  const { webinar, checklist, counts } = useSetupContext();
  const [copied, setCopied] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!webinar || !checklist) return null;

  const registrationUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/webinar/${webinarId}/register`
      : `/webinar/${webinarId}/register`;

  async function remove() {
    setDeleting(true);
    setDeleteError(null);

    const response = await fetch(`/api/admin/webinar/${webinarId}/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmTitle }),
    });

    setDeleting(false);

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setDeleteError(payload.error ?? "Could not delete.");
      return;
    }

    router.push("/admin/dashboard");
  }

  async function clone() {
    const response = await fetch(`/api/admin/webinar/${webinarId}/clone`, {
      method: "POST",
    });
    if (!response.ok) return;
    const { webinarId: cloneId } = (await response.json()) as {
      webinarId: string;
    };
    router.push(`/admin/webinar/${cloneId}`);
  }

  return (
    <>
      <SectionHeader
        title={webinar.title}
        description={webinar.description ?? undefined}
        action={<WebinarStatusBadge status={webinar.status} />}
      />

      <div className="space-y-8 px-6 py-8 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <section>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A0A0B0]">
              Setup checklist
            </h2>

            <ul className="mt-4 divide-y divide-[#1E1E2E] overflow-hidden rounded-xl border border-[#1E1E2E]">
              {ITEMS.map((item) => {
                const complete = checklist[item.key];
                return (
                  <li key={item.key}>
                    <Link
                      href={`/admin/webinar/${webinarId}${item.href}`}
                      className="flex items-center gap-3 bg-[#12121A] px-4 py-3.5 transition-colors hover:bg-[#1A1A2A]"
                    >
                      <span
                        className={cn(
                          "grid h-5 w-5 shrink-0 place-items-center rounded-full",
                          complete ? "bg-[#00C851]" : "bg-[#3A3A4A]"
                        )}
                      >
                        {complete ? (
                          <Check className="h-3 w-3 text-[#0A0A0F]" />
                        ) : (
                          <X className="h-3 w-3 text-[#0A0A0F]" />
                        )}
                      </span>
                      <span className="flex-1 text-[13.5px] text-white">
                        {item.label}
                        {item.optional && (
                          <span className="ml-2 text-[11px] text-[#A0A0B0]">
                            optional
                          </span>
                        )}
                      </span>
                      <span className="text-[11.5px] tabular-nums text-[#A0A0B0]">
                        {countFor(item.key, counts)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <h2 className="mt-8 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A0A0B0]">
              Registration link
            </h2>
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#1E1E2E] bg-[#12121A] p-2 pl-4">
              <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-[#A0A0B0]">
                {registrationUrl}
              </span>
              <AdminButton
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(registrationUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1600);
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? "Copied" : "Copy"}
              </AdminButton>
              <Link href={registrationUrl} target="_blank">
                <AdminButton variant="ghost">
                  <ExternalLink className="h-3.5 w-3.5" />
                </AdminButton>
              </Link>
            </div>
            {webinar.status !== "published" && (
              <p className="mt-2 text-[11.5px] text-[#A0A0B0]">
                This link goes live once the webinar is published.
              </p>
            )}
          </section>

          <aside>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#A0A0B0]">
              Your video
            </h2>
            <div className="mt-4">
              <VideoPreview
                src={webinar.video_url}
                durationSeconds={webinar.video_duration_seconds}
                poster={webinar.thumbnail_url}
              />
            </div>
          </aside>
        </div>

        <section className="rounded-xl border border-[#FF3B3B]/25 bg-[#FF3B3B]/[0.04] p-5">
          <h2 className="text-[13px] font-semibold text-[#FF3B3B]">Danger zone</h2>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <AdminButton variant="secondary" onClick={clone}>
              <Copy className="h-3.5 w-3.5" />
              Clone this webinar
            </AdminButton>
          </div>

          <div className="mt-5 border-t border-[#FF3B3B]/15 pt-5">
            <p className="text-[12.5px] leading-relaxed text-[#A0A0B0]">
              Deleting removes every session, registrant and chat message with it.
              Type <span className="text-white">{webinar.title}</span> to confirm.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <TextInput
                value={confirmTitle}
                onChange={(event) => setConfirmTitle(event.target.value)}
                placeholder={webinar.title}
                className="max-w-xs"
              />
              <AdminButton
                variant="danger"
                onClick={remove}
                disabled={deleting || confirmTitle !== webinar.title}
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Delete webinar
              </AdminButton>
            </div>
            {deleteError && (
              <p className="mt-2 text-[12px] text-[#FF3B3B]">{deleteError}</p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function countFor(
  key: keyof SetupChecklist,
  counts: { schedules: number; personas: number; comments: number; engagement: number } | null
) {
  if (!counts) return "";
  if (key === "schedule") return counts.schedules;
  if (key === "personas") return counts.personas;
  if (key === "comments") return counts.comments;
  if (key === "engagement") return counts.engagement;
  return "";
}
