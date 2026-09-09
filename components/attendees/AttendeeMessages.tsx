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
      <p className="rounded-xl border border-dashed border-surface-3 px-5 py-12 text-center text-[13px] text-ink-muted">
        This attendee did not send any messages.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {messages.map((message) => (
        <li
          key={message.id}
          className="rounded-xl border border-hairline bg-surface p-3.5"
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[13px] leading-relaxed text-ink">
              {message.content}
            </p>
            <time
              dateTime={message.sent_at}
              className="shrink-0 text-[11px] tabular-nums text-ink-muted"
            >
              {new Date(message.sent_at).toLocaleString()}
            </time>
          </div>

          {message.replies.map((reply) => (
            <div
              key={reply.id}
              className="mt-3 flex gap-2.5 border-l-2 border-accent/35 pl-3"
            >
              <Avatar
                name={reply.sender_name}
                avatarUrl={reply.sender_avatar}
                size={24}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 text-[10.5px] text-ink-muted">
                  <CornerDownRight className="h-2.5 w-2.5" />
                  {reply.sender_name} replied
                </p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">
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
