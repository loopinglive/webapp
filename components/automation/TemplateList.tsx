"use client";

import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

import { TemplateEditor } from "@/components/automation/TemplateEditor";
import { SectionHeader } from "@/components/admin/webinar/WebinarSetupShell";
import { useAutomationSettings } from "@/hooks/useAutomationSettings";
import { useTemplates } from "@/hooks/useTemplates";
import { TEMPLATE_BY_KEY, TRIGGER_LABELS, type TriggerType } from "@/lib/messaging/defaults";
import { cn } from "@/lib/utils";

const TRIGGERS: TriggerType[] = ["pre", "post", "re_engagement", "buyer"];

export function TemplateList({ webinarId }: { webinarId: string }) {
  const templates = useTemplates(webinarId);
  const { settings } = useAutomationSettings(webinarId);

  if (templates.loading) {
    return (
      <div className="grid h-[60dvh] place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#6C47FF]" />
      </div>
    );
  }

  return (
    <>
      <SectionHeader
        title="Message templates"
        description="What each message says. Edit the copy; the timing comes from the trigger."
        action={
          <Link
            href={`/admin/webinar/${webinarId}/automation`}
            className="inline-flex items-center gap-2 text-[13px] text-[#A0A0B0] transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Automation
          </Link>
        }
      />

      <div className="px-6 py-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-1 rounded-full border border-[#1E1E2E] bg-[#12121A] p-1">
          {TRIGGERS.map((trigger) => (
            <button
              key={trigger}
              onClick={() => templates.setTrigger(trigger)}
              className={cn(
                "rounded-full px-4 py-1.5 text-[12.5px] transition-colors",
                templates.trigger === trigger
                  ? "bg-[#6C47FF] text-white"
                  : "text-[#A0A0B0] hover:bg-white/5 hover:text-white"
              )}
            >
              {TRIGGER_LABELS[trigger]}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
          {/* List */}
          <nav className="space-y-1">
            {templates.keys.map((key) => {
              const def = TEMPLATE_BY_KEY.get(key);
              const active = key === templates.activeKey;
              const anyActive = templates.templates.some(
                (t) => t.template_key === key && t.is_active
              );

              return (
                <button
                  key={key}
                  onClick={() => templates.selectTemplate(key)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border-l-2 px-3 py-2.5 text-left text-[13px] transition-colors",
                    active
                      ? "border-[#6C47FF] bg-[#6C47FF]/15 text-white"
                      : "border-transparent text-[#A0A0B0] hover:bg-white/5 hover:text-white"
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      anyActive ? "bg-[#00C851]" : "bg-[#3A3A4A]"
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {def?.label ?? key}
                  </span>
                </button>
              );
            })}

            {!templates.keys.length && (
              <p className="rounded-lg border border-dashed border-[#3A3A4A] px-4 py-8 text-center text-[12.5px] text-[#A0A0B0]">
                No templates in this group.
              </p>
            )}
          </nav>

          {/* Editor */}
          <div className="min-w-0">
            {templates.selected ? (
              <TemplateEditor
                key={templates.selected.id}
                template={templates.selected}
                channels={templates.channelsForKey}
                activeChannel={templates.activeChannel}
                onChannelChange={templates.setChannel}
                onSave={templates.saveTemplate}
                isSaving={templates.isSaving}
                fromName={settings?.from_name ?? "Loopinglive"}
                fromEmail={settings?.from_email ?? "noreply@loopinglive.com"}
              />
            ) : (
              <p className="rounded-xl border border-dashed border-[#3A3A4A] px-6 py-16 text-center text-[13px] text-[#A0A0B0]">
                Pick a template to edit.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
