"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

import {
  AIPersonaForm,
  type PersonaDraft,
} from "@/components/admin/ai-config/AIPersonaForm";
import { AIPersonaTestChat } from "@/components/admin/ai-config/AIPersonaTestChat";
import { AdminButton, Field, TextArea, TextInput } from "@/components/admin/ui/Field";
import {
  SectionHeader,
  useSetupContext,
} from "@/components/admin/webinar/WebinarSetupShell";
import type { AiPersona } from "@/types";

const blank = (name: string): PersonaDraft => ({
  personaName: name,
  avatarUrl: "",
  personalityBrief: "",
  fakeCommentReplyPercentage: 50,
  isActive: true,
});

export function AIPersonaConfig({ webinarId }: { webinarId: string }) {
  const { refresh } = useSetupContext();
  const [drafts, setDrafts] = useState<PersonaDraft[]>([
    blank("Sarah"),
    blank("James"),
  ]);
  const [context, setContext] = useState({
    topic: "",
    offerDescription: "",
    keyTalkingPoints: "",
    objectionNotes: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(
      `/api/admin/webinar/${webinarId}/ai-personas`,
      { cache: "no-store" }
    );

    if (response.ok) {
      const payload = (await response.json()) as {
        personas: AiPersona[];
        context: {
          topic: string | null;
          offer_description: string | null;
          key_talking_points: string | null;
          objection_notes: string | null;
        } | null;
      };

      if (payload.personas.length) {
        setDrafts([
          ...payload.personas.slice(0, 2).map((persona) => ({
            id: persona.id,
            personaName: persona.persona_name,
            avatarUrl: persona.avatar_url ?? "",
            personalityBrief: persona.personality_brief,
            fakeCommentReplyPercentage: persona.fake_comment_reply_percentage,
            isActive: persona.is_active,
          })),
          ...(payload.personas.length < 2 ? [blank("James")] : []),
        ]);
      }

      if (payload.context) {
        setContext({
          topic: payload.context.topic ?? "",
          offerDescription: payload.context.offer_description ?? "",
          keyTalkingPoints: payload.context.key_talking_points ?? "",
          objectionNotes: payload.context.objection_notes ?? "",
        });
      }
    }

    setLoading(false);
  }, [webinarId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    setError(null);

    const response = await fetch(
      `/api/admin/webinar/${webinarId}/ai-personas`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personas: drafts, context }),
      }
    );

    setSaving(false);

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "Could not save.");
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await load();
    refresh();
  }

  if (loading) {
    return (
      <div className="grid h-[60dvh] place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  return (
    <>
      <SectionHeader
        title="AI moderators"
        description="Two named humans, as far as your audience is concerned."
        action={
          <AdminButton onClick={save} disabled={saving}>
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saved ? (
              <Check className="h-3.5 w-3.5" />
            ) : null}
            {saved ? "Saved" : "Save moderators"}
          </AdminButton>
        }
      />

      <div className="max-w-5xl space-y-8 px-6 py-8 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-2">
          {drafts.map((draft, index) => (
            <AIPersonaForm
              key={index}
              index={index}
              draft={draft}
              onChange={(next) =>
                setDrafts((current) =>
                  current.map((item, i) => (i === index ? next : item))
                )
              }
            />
          ))}
        </div>

        <section className="space-y-4 rounded-xl border border-[#1E1E2E] bg-[#12121A] p-5">
          <div>
            <h2 className="text-[13px] font-semibold text-white">
              What they both know
            </h2>
            <p className="mt-1 text-[12px] text-[#A0A0B0]">
              Shared context. This is what stops answers sounding generic.
            </p>
          </div>

          <Field label="Webinar topic">
            <TextInput
              value={context.topic}
              onChange={(event) =>
                setContext({ ...context, topic: event.target.value })
              }
              placeholder="Building one high-converting offer"
            />
          </Field>

          <Field label="What is being sold">
            <TextArea
              rows={2}
              value={context.offerDescription}
              onChange={(event) =>
                setContext({ ...context, offerDescription: event.target.value })
              }
              placeholder="A $997 course covering the full system taught in the session."
            />
          </Field>

          <Field label="Key talking points" hint="One per line">
            <TextArea
              rows={4}
              value={context.keyTalkingPoints}
              onChange={(event) =>
                setContext({ ...context, keyTalkingPoints: event.target.value })
              }
              placeholder={"The three-offer structure\nPricing ladder\nFollow-up that closes"}
            />
          </Field>

          <Field label="Common objections and how to handle them">
            <TextArea
              rows={4}
              value={context.objectionNotes}
              onChange={(event) =>
                setContext({ ...context, objectionNotes: event.target.value })
              }
              placeholder={"“Too expensive” → point at the payment plan\n“No audience yet” → this works from zero"}
            />
          </Field>
        </section>

        <AIPersonaTestChat webinarId={webinarId} drafts={drafts} />

        {error && <p className="text-[12.5px] text-[#FF3B3B]">{error}</p>}
      </div>
    </>
  );
}
