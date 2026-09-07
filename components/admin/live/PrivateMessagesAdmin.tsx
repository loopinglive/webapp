"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";

import { usePrivateMessages } from "@/hooks/usePrivateMessages";
import { cn } from "@/lib/utils";

type Thread = { registrantId: string; name: string; lastMessage: string; lastSentAt: string; unread: number };

export function PrivateMessagesAdmin({ webinarId, sessionId }: { webinarId: string; sessionId: string | null }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const { messages, send } = usePrivateMessages({ webinarId, sessionId, registrantId: active });

  useEffect(() => {
    if (!sessionId) return;
    const load = async () => {
      const response = await fetch(`/api/webinar/${webinarId}/private-messages?sessionId=${sessionId}`, {
        cache: "no-store",
      });
      if (response.ok) {
        const { threads: rows } = (await response.json()) as { threads: Thread[] };
        setThreads(rows);
      }
    };
    void load();
    const poll = setInterval(load, 8000);
    return () => clearInterval(poll);
  }, [webinarId, sessionId]);

  if (!sessionId) {
    return <p className="px-6 py-6 text-[12.5px] text-[#A0A0B0]">No live session running.</p>;
  }

  return (
    <div className="flex h-96 overflow-hidden rounded-lg border border-[#2A2A3A]">
      <div className="w-56 overflow-y-auto border-r border-[#2A2A3A] bg-[#12121A]">
        {threads.length === 0 && (
          <p className="px-3 py-4 text-[12px] text-[#A0A0B0]">No private messages yet.</p>
        )}
        {threads.map((thread) => (
          <button
            key={thread.registrantId}
            onClick={() => setActive(thread.registrantId)}
            className={cn(
              "block w-full border-b border-[#1E1E2E] px-3 py-2.5 text-left",
              active === thread.registrantId ? "bg-[#1E1E2E]" : "hover:bg-[#1A1A2A]"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="truncate text-[12.5px] font-medium text-white">{thread.name}</span>
              {thread.unread > 0 && (
                <span className="rounded-full bg-[#6C47FF] px-1.5 text-[10px] text-white">{thread.unread}</span>
              )}
            </div>
            <p className="truncate text-[11.5px] text-[#A0A0B0]">{thread.lastMessage}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col bg-[#0F0F16]">
        {!active ? (
          <p className="m-auto text-[12.5px] text-[#A0A0B0]">Select a conversation</p>
        ) : (
          <>
            <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[75%] rounded-lg px-3 py-1.5 text-[12.5px]",
                    message.sender_type === "host"
                      ? "ml-auto bg-[#6C47FF]/20 text-white"
                      : "bg-[#1E1E2E] text-[#E5E5EA]"
                  )}
                >
                  {message.content}
                </div>
              ))}
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void send(draft, "host");
                setDraft("");
              }}
              className="flex items-center gap-2 border-t border-[#2A2A3A] p-2.5"
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Reply privately…"
                className="flex-1 rounded-lg border border-[#2A2A3A] bg-[#1A1A2A] px-3 py-2 text-[12.5px] text-white focus:border-[#6C47FF] focus:outline-none"
              />
              <button type="submit" className="text-[#6C47FF] hover:text-[#7C5AFF]">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
