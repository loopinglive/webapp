"use client";

import { useRef, useState } from "react";
import { Check, Loader2, Mail, MessageCircle, Send, Smartphone } from "lucide-react";

import { ChannelPreview } from "@/components/automation/ChannelPreview";
import { VariableHelper } from "@/components/automation/VariableHelper";
import { AdminButton, Field, TextArea, TextInput } from "@/components/admin/ui/Field";
import { Toggle } from "@/components/registration-builder/sections/Toggle";
import { TEMPLATE_BY_KEY } from "@/lib/messaging/defaults";
import { VARIABLE_GROUPS, WHATSAPP_LIMIT } from "@/lib/messaging/templates";
import { cn } from "@/lib/utils";
import type { MessageChannel, MessageTemplateRow } from "@/types/database";

const CHANNEL_META: Record<
  MessageChannel,
  { label: string; icon: typeof Mail; colour: string }
> = {
  email: { label: "Email", icon: Mail, colour: "#6C47FF" },
  sms: { label: "SMS", icon: Smartphone, colour: "#00D4FF" },
  whatsapp: { label: "WhatsApp", icon: MessageCircle, colour: "#00C851" },
};

/** Variables that make no sense before the event they describe has happened. */
const POST_ONLY = ["replay_link", "replay_expires_at", "purchase_date"];
const OFFER_ONLY = ["offer_title", "offer_url", "offer_countdown"];

function allowedVariables(template: MessageTemplateRow) {
  const all = VARIABLE_GROUPS.flatMap((group) =>
    group.variables.map((variable) => variable.key)
  );
  const def = TEMPLATE_BY_KEY.get(template.template_key);

  return all.filter((key) => {
    if (POST_ONLY.includes(key) && def?.triggerType === "pre") return false;
    if (OFFER_ONLY.includes(key) && def?.triggerType === "pre") return false;
    if (key === "unsubscribe_link" && template.channel !== "email") return false;
    return true;
  });
}

export function TemplateEditor({
  template,
  channels,
  activeChannel,
  onChannelChange,
  onSave,
  isSaving,
  fromName,
  fromEmail,
}: {
  template: MessageTemplateRow;
  channels: MessageChannel[];
  activeChannel: MessageChannel;
  onChannelChange: (channel: MessageChannel) => void;
  onSave: (patch: {
    subject?: string | null;
    body?: string;
    isActive?: boolean;
  }) => Promise<boolean>;
  isSaving: boolean;
  fromName: string;
  fromEmail: string;
}) {
  const [subject, setSubject] = useState(template.subject ?? "");
  const [body, setBody] = useState(template.body);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Switching template or channel replaces the editor entirely.
  const [lastId, setLastId] = useState(template.id);
  if (template.id !== lastId) {
    setLastId(template.id);
    setSubject(template.subject ?? "");
    setBody(template.body);
    setTestResult(null);
  }

  const def = TEMPLATE_BY_KEY.get(template.template_key);

  /** Drops a variable in at the cursor rather than at the end. */
  function insert(variable: string) {
    const field = bodyRef.current;
    if (!field) {
      setBody((current) => current + variable);
      return;
    }
    const start = field.selectionStart ?? body.length;
    const end = field.selectionEnd ?? body.length;
    const next = body.slice(0, start) + variable + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(start + variable.length, start + variable.length);
    });
  }

  async function save() {
    const ok = await onSave({
      subject: activeChannel === "email" ? subject : null,
      body,
    });
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    }
  }

  async function sendTest() {
    setTesting(true);
    setTestResult(null);

    const response = await fetch("/api/admin/automation/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId: template.id,
        recipientPhone: testPhone || undefined,
      }),
    });

    const payload = (await response.json()) as {
      sentTo?: string;
      error?: string;
    };
    setTesting(false);
    setTestResult(
      response.ok ? `Test sent to ${payload.sentTo}` : (payload.error ?? "Test failed")
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-white">
            {def?.label ?? template.template_key}
          </h2>
          <p className="mt-0.5 font-mono text-[11px] text-[#A0A0B0]">
            {template.template_key}
          </p>
        </div>

        <Toggle
          label={template.is_active ? "Active" : "Disabled"}
          checked={template.is_active}
          onChange={(value) => void onSave({ isActive: value })}
        />
      </div>

      {/* Channel tabs */}
      <div className="flex items-center gap-1 rounded-full border border-[#2A2A3A] bg-[#1A1A2A] p-1">
        {channels.map((channel) => {
          const meta = CHANNEL_META[channel];
          const active = channel === activeChannel;
          return (
            <button
              key={channel}
              onClick={() => onChannelChange(channel)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors",
                active ? "text-white" : "text-[#A0A0B0] hover:text-white"
              )}
              style={active ? { background: meta.colour } : undefined}
            >
              <meta.icon className="h-3.5 w-3.5" />
              {meta.label}
            </button>
          );
        })}
      </div>

      {activeChannel === "email" && (
        <Field label="Subject" required>
          <TextInput
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="You are registered for {{webinar_title}}"
          />
        </Field>
      )}

      <Field
        label="Message"
        required
        hint={
          activeChannel === "whatsapp"
            ? `${body.length}/${WHATSAPP_LIMIT}`
            : `${body.length} characters`
        }
        error={
          activeChannel === "whatsapp" && body.length > WHATSAPP_LIMIT
            ? "WhatsApp caps messages at 1024 characters."
            : null
        }
      >
        <TextArea
          ref={bodyRef}
          rows={activeChannel === "email" ? 12 : 6}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="font-mono text-[12.5px]"
        />
      </Field>

      <p className="rounded-lg border border-[#2A2A3A] bg-[#1A1A2A] px-3.5 py-2.5 text-[11.5px] leading-relaxed text-[#A0A0B0]">
        {activeChannel === "email"
          ? "An unsubscribe link is added to every email automatically. You do not need to include one."
          : activeChannel === "sms"
            ? "“Reply STOP to unsubscribe” is appended automatically if your text does not already say it."
            : "Use *bold* and _italic_. Emojis are supported and tend to lift response rates on WhatsApp."}
      </p>

      <VariableHelper allowed={allowedVariables(template)} onInsert={insert} />

      <div className="flex flex-wrap items-center gap-2">
        <AdminButton onClick={save} disabled={isSaving || !body.trim()}>
          {isSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : saved ? (
            <Check className="h-3.5 w-3.5" />
          ) : null}
          {saved ? "Saved" : "Save template"}
        </AdminButton>

        {activeChannel !== "email" && (
          <TextInput
            value={testPhone}
            onChange={(event) => setTestPhone(event.target.value)}
            placeholder="+447700900123"
            className="h-10 max-w-[190px]"
          />
        )}

        <AdminButton variant="secondary" onClick={sendTest} disabled={testing}>
          {testing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Send test
        </AdminButton>

        {testResult && (
          <span
            className={cn(
              "text-[12px]",
              testResult.startsWith("Test sent") ? "text-[#00C851]" : "text-[#FF3B3B]"
            )}
          >
            {testResult}
          </span>
        )}
      </div>

      <p className="text-[11px] text-[#A0A0B0]">
        Tests always use example data — never a real attendee&rsquo;s details.
      </p>

      <ChannelPreview
        channel={activeChannel}
        subject={subject}
        body={body}
        fromName={fromName}
        fromEmail={fromEmail}
      />
    </div>
  );
}
