import { Avatar } from "@/components/ui/Avatar";
import { ReplyMessage } from "@/components/webinar/ReplyMessage";
import { cn, formatClock } from "@/lib/utils";
import type { ChatMessage as Message } from "@/types";

/**
 * One line of chat.
 *
 * Rule 4: nothing here branches on `is_fake` or `is_real_user`. A persona drop
 * and a real attendee's message render identically — the highlighting for real
 * users belongs to the admin panel, behind `adminView`.
 */
export function ChatMessage({
  message,
  replyToName = null,
  adminView = false,
}: {
  message: Message;
  /** Sender of the message this one answers, if it is a reply. */
  replyToName?: string | null;
  adminView?: boolean;
}) {
  if (message.reply_to_message_id) {
    return (
      <ReplyMessage
        message={message}
        replyToName={replyToName}
        adminView={adminView}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex gap-2.5 rounded-lg px-2 py-1.5 transition-colors",
        adminView && message.is_real_user && "bg-[#6C47FF]/10"
      )}
    >
      <Avatar
        name={message.sender_name}
        avatarUrl={message.sender_avatar}
        size={30}
        className="mt-0.5"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="truncate text-[12.5px] font-semibold text-white">
            {message.sender_name}
          </span>
          {message.sender_location && (
            <span className="shrink-0 text-[11px] text-[#A0A0B0]/70">
              from {message.sender_location}
            </span>
          )}
          <time
            dateTime={message.sent_at}
            className="ml-auto shrink-0 text-[10.5px] tabular-nums text-[#A0A0B0]/60"
          >
            {formatClock(new Date(message.sent_at))}
          </time>
        </div>

        <p className="mt-0.5 break-words text-[13px] leading-relaxed text-[#A0A0B0]">
          {message.content}
        </p>
      </div>
    </div>
  );
}
