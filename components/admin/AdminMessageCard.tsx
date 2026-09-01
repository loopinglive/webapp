"use client";

import { Clock, CornerDownLeft } from "lucide-react";

import { AdminReplyBox } from "@/components/admin/AdminReplyBox";
import { Avatar } from "@/components/ui/Avatar";
import { ReplyMessage } from "@/components/webinar/ReplyMessage";
import { cn, formatClock } from "@/lib/utils";
import type { AiPersona, ChatMessage, PersonaModeMap } from "@/types";

type Props = {
  message: ChatMessage;
  replies: ChatMessage[];
  sessionId: string;
  personas: AiPersona[];
  personaModes: PersonaModeMap;
  replyOpen: boolean;
  onToggleReply: () => void;
};

export function AdminMessageCard({
  message,
  replies,
  sessionId,
  personas,
  personaModes,
  replyOpen,
  onToggleReply,
}: Props) {
  const isReal = message.is_real_user;

  return (
    <div
      className={cn(
        "group rounded-xl px-3 py-2.5 transition-colors",
        // Rule 3: real users are the leads. They should be findable at a glance.
        isReal
          ? "border-l-[3px] border-[#6C47FF] bg-[#6C47FF]/12"
          : "border-l-[3px] border-transparent hover:bg-white/[0.03]"
      )}
    >
      <div className="flex gap-2.5">
        <Avatar
          name={message.sender_name}
          avatarUrl={message.sender_avatar}
          size={32}
          className="mt-0.5"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-[13px] font-semibold text-white">
              {message.sender_name}
            </span>
            {message.sender_location && (
              <span className="text-[11px] text-[#A0A0B0]/70">
                from {message.sender_location}
              </span>
            )}

            {isReal && (
              <span className="rounded-full bg-[#6C47FF] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white">
                Real user
              </span>
            )}
            {message.has_ai_reply && (
              <span className="rounded-full bg-[#00C851]/15 px-2 py-0.5 text-[9.5px] font-semibold text-[#00C851]">
                ✓ Replied
              </span>
            )}
            {!message.has_ai_reply && message.ai_reply_pending && (
              <span className="flex items-center gap-1 rounded-full bg-[#FF3B3B]/15 px-2 py-0.5 text-[9.5px] font-semibold text-[#FF3B3B]">
                <Clock className="h-2.5 w-2.5" />
                Pending
              </span>
            )}

            <time
              dateTime={message.sent_at}
              className="ml-auto shrink-0 text-[10.5px] tabular-nums text-[#A0A0B0]/60"
            >
              {formatClock(new Date(message.sent_at))}
            </time>
          </div>

          <p className="mt-1 break-words text-[13px] leading-relaxed text-[#A0A0B0]">
            {message.content}
          </p>
        </div>

        {/* Rule 2: this button exists only here. The viewer chat never renders it. */}
        <button
          onClick={onToggleReply}
          className={cn(
            "flex h-7 shrink-0 items-center gap-1.5 self-start rounded-full border px-3 text-[11px] transition-all duration-200",
            replyOpen
              ? "border-[#6C47FF] bg-[#6C47FF]/15 text-white"
              : "border-[#1E1E2E] text-[#A0A0B0] opacity-0 hover:border-[#6C47FF]/60 hover:text-white focus-visible:opacity-100 group-hover:opacity-100"
          )}
        >
          <CornerDownLeft className="h-3 w-3" />
          Reply
        </button>
      </div>

      {replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {replies.map((reply) => (
            <ReplyMessage
              key={reply.id}
              message={reply}
              replyToName={message.sender_name}
              adminView
            />
          ))}
        </div>
      )}

      {replyOpen && (
        <AdminReplyBox
          message={message}
          sessionId={sessionId}
          personas={personas}
          personaModes={personaModes}
          onClose={onToggleReply}
          onSent={onToggleReply}
        />
      )}
    </div>
  );
}
