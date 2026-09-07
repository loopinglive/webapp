"use client";

import { useState } from "react";
import { Check, Copy, Loader2, Sparkles, Trash2 } from "lucide-react";

import { AdminButton, Field, TextArea, TextInput } from "@/components/admin/ui/Field";
import { SectionHeader } from "@/components/admin/webinar/WebinarSetupShell";
import { AD_PLATFORMS, useAdCreatives, type AdCreative, type AdPlatform } from "@/hooks/useAdCreatives";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<AdCreative["status"], string> = {
  draft: "bg-[#3A3A4A] text-[#A0A0B0]",
  approved: "bg-[#00C851]/15 text-[#00C851]",
  archived: "bg-[#6A6A80]/20 text-[#6A6A80]",
};

export function AdCreativeGenerator({ webinarId }: { webinarId: string }) {
  const { creatives, loading, generating, error, generate, update, remove } = useAdCreatives(webinarId);
  const [platform, setPlatform] = useState<AdPlatform>("facebook");
  const [targetAudience, setTargetAudience] = useState("");
  const [count, setCount] = useState(3);

  const valid = targetAudience.trim().length > 0;

  return (
    <>
      <SectionHeader
        title="Ad Creatives"
        description="AI-drafted ad copy, sized to each platform's real character limits. Review and approve before spending anything on it."
      />

      <div className="px-6 py-6 lg:px-8">
        <div className="mb-6 rounded-xl border border-[#1E1E2E] bg-[#12121A] p-4">
          <div className="grid gap-4 sm:grid-cols-[160px_1fr_100px]">
            <Field label="Platform">
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as AdPlatform)}
                className="h-11 w-full rounded-lg border border-[#2A2A3A] bg-[#1A1A2A] px-3.5 text-[13.5px] text-white focus:border-[#6C47FF] focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/20"
              >
                {AD_PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Target audience" required hint="Who this ad is aimed at">
              <TextInput
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Freelance consultants earning under $10k/mo"
              />
            </Field>
            <Field label="Variations">
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="h-11 w-full rounded-lg border border-[#2A2A3A] bg-[#1A1A2A] px-3.5 text-[13.5px] text-white focus:border-[#6C47FF] focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/20"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="mt-4">
            <AdminButton disabled={!valid || generating} onClick={() => void generate(platform, targetAudience, count)}>
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {generating ? "Generating…" : "Generate ad copy"}
            </AdminButton>
          </div>

          {error && <p className="mt-3 text-[12.5px] text-[#FF3B3B]">{error}</p>}
        </div>

        {loading ? (
          <div className="grid h-40 place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
          </div>
        ) : !creatives || creatives.length === 0 ? (
          <div className="grid h-32 place-items-center rounded-xl border border-dashed border-[#1E1E2E] text-[13px] text-[#6A6A80]">
            No ad copy yet. Generate your first batch above.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {creatives.map((creative) => (
              <CreativeCard key={creative.id} creative={creative} onUpdate={update} onRemove={remove} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function CreativeCard({
  creative,
  onUpdate,
  onRemove,
}: {
  creative: AdCreative;
  onUpdate: (id: string, patch: Partial<AdCreative>) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [headline, setHeadline] = useState(creative.headline);
  const [primaryText, setPrimaryText] = useState(creative.primary_text);
  const [callToAction, setCallToAction] = useState(creative.call_to_action);
  const [copied, setCopied] = useState(false);

  async function save() {
    await onUpdate(creative.id, { headline, primary_text: primaryText, call_to_action: callToAction });
    setEditing(false);
  }

  async function copy() {
    await navigator.clipboard.writeText(`${headline}\n\n${primaryText}\n\n${callToAction}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col rounded-xl border border-[#1E1E2E] bg-[#12121A] p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#A0A0B0]">
          {creative.platform}
        </span>
        <select
          value={creative.status}
          onChange={(e) => void onUpdate(creative.id, { status: e.target.value as AdCreative["status"] })}
          className={cn(
            "rounded-full border-0 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] focus:outline-none",
            STATUS_STYLE[creative.status]
          )}
        >
          <option value="draft">Draft</option>
          <option value="approved">Approved</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {editing ? (
        <div className="flex flex-1 flex-col gap-2.5">
          <TextInput value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Headline" />
          <TextArea rows={3} value={primaryText} onChange={(e) => setPrimaryText(e.target.value)} placeholder="Primary text" />
          <TextInput value={callToAction} onChange={(e) => setCallToAction(e.target.value)} placeholder="Call to action" />
          <div className="mt-1 flex gap-2">
            <AdminButton onClick={() => void save()} className="h-8 px-3 text-[12px]">
              Save
            </AdminButton>
            <AdminButton variant="ghost" onClick={() => setEditing(false)} className="h-8 px-3 text-[12px]">
              Cancel
            </AdminButton>
          </div>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="flex-1 text-left">
          <p className="text-[14px] font-semibold text-white">{creative.headline}</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#C8C8D4]">{creative.primary_text}</p>
          <span className="mt-2 inline-block rounded-md bg-[#6C47FF]/15 px-2 py-1 text-[11px] font-semibold text-[#6C47FF]">
            {creative.call_to_action}
          </span>
        </button>
      )}

      {!editing && (
        <div className="mt-3 flex items-center justify-end gap-1 border-t border-[#1E1E2E] pt-3">
          <IconButton title="Copy" onClick={() => void copy()}>
            {copied ? <Check className="h-3.5 w-3.5 text-[#00C851]" /> : <Copy className="h-3.5 w-3.5" />}
          </IconButton>
          <IconButton title="Delete" danger onClick={() => void onRemove(creative.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      )}
    </div>
  );
}

function IconButton({
  children,
  title,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        "rounded-full p-1.5 transition-colors",
        danger ? "text-[#6A6A80] hover:bg-[#FF3B3B]/10 hover:text-[#FF3B3B]" : "text-[#6A6A80] hover:bg-white/5 hover:text-white"
      )}
    >
      {children}
    </button>
  );
}
