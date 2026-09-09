"use client";

import { Fragment, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";

import { SectionHeader } from "@/components/admin/webinar/WebinarSetupShell";
import { useSupportConversations, type SupportConversation } from "@/hooks/useSupportConversations";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<SupportConversation["status"], string> = {
  open: "bg-cyan/15 text-cyan",
  resolved: "bg-[#00C851]/15 text-[#00C851]",
  escalated: "bg-[#FF9500]/15 text-[#FF9500]",
};

export function SupportConversations({ webinarId }: { webinarId: string }) {
  const { conversations, loading, setStatus } = useSupportConversations(webinarId);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <>
      <SectionHeader
        title="AI Support Chat"
        description="Questions the AI answered live from this webinar's own material -- flagged for you whenever it wasn't sure."
      />

      <div className="px-6 py-6 lg:px-8">
        {loading ? (
          <div className="grid h-40 place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        ) : !conversations || conversations.length === 0 ? (
          <div className="grid h-32 place-items-center rounded-xl border border-dashed border-hairline text-[13px] text-ink-faint">
            No support conversations yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {conversations.map((conversation) => {
              const open = openId === conversation.id;
              return (
                <div key={conversation.id} className="rounded-xl border border-hairline bg-surface">
                  <div
                    onClick={() => setOpenId(open ? null : conversation.id)}
                    className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-ink">
                        {conversation.registrant?.full_name ?? "Unknown attendee"}
                      </p>
                      <p className="truncate text-[11.5px] text-ink-faint">
                        {conversation.messages.length} messages
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em]",
                        STATUS_STYLE[conversation.status]
                      )}
                    >
                      {conversation.status}
                    </span>
                    {conversation.status !== "resolved" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void setStatus(conversation.id, "resolved");
                        }}
                        className="rounded-full border border-surface-3 px-3 py-1 text-[11.5px] text-ink-muted transition-colors hover:border-surface-3 hover:text-ink"
                      >
                        Mark resolved
                      </button>
                    )}
                    <ChevronDown className={cn("h-4 w-4 text-ink-faint transition-transform", open && "rotate-180")} />
                  </div>

                  {open && (
                    <div className="border-t border-hairline px-4 py-3">
                      <div className="flex flex-col gap-2">
                        {conversation.messages.map((message, index) => (
                          <Fragment key={index}>
                            <div
                              className={cn(
                                "max-w-[80%] rounded-lg px-3 py-2 text-[12.5px]",
                                message.role === "attendee"
                                  ? "self-start bg-surface-2 text-[#C8C8D4]"
                                  : "self-end ml-auto bg-accent/15 text-ink"
                              )}
                            >
                              {message.content}
                            </div>
                          </Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
