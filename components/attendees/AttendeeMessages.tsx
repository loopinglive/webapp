import { CornerDownRight } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import type { ChatMessage } from "@/types";

export function AttendeeMessages({
  messages,
}: {
  messages: (ChatMessage & { replies: ChatMessage[] })[];
}) {
  if (!messages.length) {
    return (
      <p className="rounded-xl border border-dashed border-[#3A3A4A] px-5 py-12 text-center text-[13px] text-[#A0A0B0]">
        This attendee did not send any messages.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {messages.map((message) => (
        <li
          key={message.id}
          className="rounded-xl border border-[#1E1E2E] bg-[#12121A] p-3.5"
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[13px] leading-relaxed text-white">
              {message.content}
            </p>
            <time
              dateTime={message.sent_at}
              className="shrink-0 text-[11px] tabular-nums text-[#A0A0B0]"
            >
              {new Date(message.sent_at).toLocaleString()}
            </time>
          </div>

          {message.replies.map((reply) => (
            <div
              key={reply.id}
              className="mt-3 flex gap-2.5 border-l-2 border-[#6C47FF]/35 pl-3"
            >
              <Avatar
                name={reply.sender_name}
                avatarUrl={reply.sender_avatar}
                size={24}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 text-[10.5px] text-[#A0A0B0]">
                  <CornerDownRight className="h-2.5 w-2.5" />
                  {reply.sender_name} replied
                </p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#A0A0B0]">
                  {reply.content}
                </p>
              </div>
            </div>
          ))}
        </li>
      ))}
    </ul>
  );
}
