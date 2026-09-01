import { CornerDownRight } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { cn, formatClock } from "@/lib/utils";
import type { ChatMessage as Message } from "@/types";

/**
 * A persona's reply, threaded under whoever it answers.
 *
 * Rule 4 still holds here: nothing on screen says whether this came from Claude
 * or from the admin typing in the live panel. The only difference from a
 * top-level message is that it points at the person it answers.
 */
export function ReplyMessage({
  message,
  replyToName,
  adminView = false,
}: {
  message: Message;
  replyToName: string | null;
  adminView?: boolean;
}) {
  return (
    <div
      className={cn(
        "ml-3 flex gap-2.5 border-l-2 border-[#6C47FF]/35 pl-3",
        adminView && "py-1"
      )}
    >
      <Avatar
        name={message.sender_name}
        avatarUrl={message.sender_avatar}
        size={26}
        className="mt-0.5"
      />

      <div className="min-w-0 flex-1">
        {replyToName && (
          <div className="flex items-center gap-1 text-[10.5px] text-[#A0A0B0]/70">
            <CornerDownRight className="h-2.5 w-2.5" />
            replying to <span className="text-[#6C47FF]">@{replyToName}</span>
          </div>
        )}

        <div className="flex items-baseline gap-1.5">
          <span className="truncate text-[12px] font-semibold text-white">
            {message.sender_name}
          </span>
          <time
            dateTime={message.sent_at}
            className="ml-auto shrink-0 text-[10px] tabular-nums text-[#A0A0B0]/60"
          >
            {formatClock(new Date(message.sent_at))}
          </time>
        </div>

        <p className="mt-0.5 break-words text-[12.5px] leading-relaxed text-[#A0A0B0]">
          {message.content}
        </p>
      </div>
    </div>
  );
}
