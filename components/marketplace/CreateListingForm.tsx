"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useToast } from "@/components/ui/ToastProvider";

const TYPES = [
  { id: "webinar_template", label: "Webinar Template", hint: "personas, comments and email templates together" },
  { id: "persona_pack", label: "Persona Pack", hint: '[{"name","avatarUrl","location"}]' },
  { id: "comment_script", label: "Comment Script", hint: '[{"personaName","content","offsetSeconds"}]' },
  { id: "email_sequence", label: "Email Sequence", hint: '[{"templateKey","triggerType","channel","subject","body","delayHours"}]' },
  { id: "registration_page", label: "Registration Page", hint: undefined },
  { id: "offer_page", label: "Offer Page", hint: undefined },
  { id: "ai_prompt", label: "AI Persona Prompt", hint: undefined },
  { id: "webinar_script", label: "Webinar Script", hint: undefined },
] as const;

/**
 * What a buyer receives is entered as JSON here, matched against the shape
 * `apply-template` actually reads: `{"personas":[...],"comments":[...],
 * "emailTemplates":[...]}`. A visual builder for every one of these shapes
 * is a lot of surface for a first version; the JSON field is what a seller
 * who is capable of packaging a template at all can already produce, and
 * apply-template validates it loosely and skips anything it cannot use
 * rather than failing outright.
 */
export function CreateListingForm() {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]["id"]>("persona_pack");
  const [price, setPrice] = useState("0");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [tags, setTags] = useState("");
  const [includedJson, setIncludedJson] = useState('{\n  "personas": []\n}');
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);

    let includedItems: unknown;
    try {
      includedItems = JSON.parse(includedJson);
    } catch {
      setError("What buyers receive is not valid JSON.");
      return;
    }

    setSaving(true);
    const response = await fetch("/api/marketplace/listing/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        category: type,
        listingType: type,
        price: Number(price) || 0,
        thumbnailUrl,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 8),
        includedItems,
      }),
    });
    const payload = (await response.json()) as { listing?: { id: string }; error?: string };
    setSaving(false);

    if (!response.ok || !payload.listing) {
      setError(payload.error ?? "Could not create the listing.");
      return;
    }

    toast.success("Submitted for review.");
    router.push("/marketplace/sell");
  }

  const activeType = TYPES.find((entry) => entry.id === type);

  return (
    <div className="mx-auto max-w-xl space-y-4 px-6 py-6 lg:px-10">
      <h1 className="text-[20px] font-semibold text-white">New listing</h1>
      <p className="text-[12.5px] text-[#6E6E80]">
        Reviewed before it goes live — usually within 48 hours.
      </p>

      <label className="block">
        <span className="text-[12px] text-[#A0A0B0]">Title</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 h-10 w-full rounded-lg border border-[#1E1E2E] bg-[#12121A] px-3 text-[13.5px] text-white focus:border-[#6C47FF] focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-[12px] text-[#A0A0B0]">Description</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-[#1E1E2E] bg-[#12121A] px-3 py-2 text-[13.5px] text-white focus:border-[#6C47FF] focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-[12px] text-[#A0A0B0]">Type</span>
        <select
          value={type}
          onChange={(event) => setType(event.target.value as typeof type)}
          className="mt-1 h-10 w-full rounded-lg border border-[#1E1E2E] bg-[#12121A] px-3 text-[13.5px] text-white focus:outline-none"
        >
          {TYPES.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-3">
        <label className="block flex-1">
          <span className="text-[12px] text-[#A0A0B0]">Price ($0 = free, min $5)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-[#1E1E2E] bg-[#12121A] px-3 text-[13.5px] text-white focus:border-[#6C47FF] focus:outline-none"
          />
        </label>
        <label className="block flex-1">
          <span className="text-[12px] text-[#A0A0B0]">Tags, comma separated</span>
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-[#1E1E2E] bg-[#12121A] px-3 text-[13.5px] text-white focus:border-[#6C47FF] focus:outline-none"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-[12px] text-[#A0A0B0]">Thumbnail URL</span>
        <input
          value={thumbnailUrl}
          onChange={(event) => setThumbnailUrl(event.target.value)}
          placeholder="https://…"
          className="mt-1 h-10 w-full rounded-lg border border-[#1E1E2E] bg-[#12121A] px-3 text-[13.5px] text-white placeholder:text-[#4A4A5C] focus:border-[#6C47FF] focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-[12px] text-[#A0A0B0]">
          What buyers receive (JSON){activeType?.hint && ` — ${activeType.hint}`}
        </span>
        <textarea
          value={includedJson}
          onChange={(event) => setIncludedJson(event.target.value)}
          rows={8}
          spellCheck={false}
          className="mt-1 w-full rounded-lg border border-[#1E1E2E] bg-[#0A0A0F] px-3 py-2 font-mono text-[12.5px] text-white focus:border-[#6C47FF] focus:outline-none"
        />
      </label>

      {error && <p className="text-[12.5px] text-[#FF5A5A]">{error}</p>}

      <button
        onClick={() => void save()}
        disabled={saving || !title.trim() || !description.trim() || !thumbnailUrl.trim()}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#6C47FF] px-4 text-[13.5px] font-medium text-white hover:bg-[#5B39E0] disabled:opacity-50"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Submit for review
      </button>
    </div>
  );
}
