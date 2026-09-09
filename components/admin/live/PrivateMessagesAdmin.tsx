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
    return <p className="px-6 py-6 text-[12.5px] text-ink-muted">No live session running.</p>;
  }

  return (
    <div className="flex h-96 overflow-hidden rounded-lg border border-surface-3">
      <div className="w-56 overflow-y-auto border-r border-surface-3 bg-surface">
        {threads.length === 0 && (
          <p className="px-3 py-4 text-[12px] text-ink-muted">No private messages yet.</p>
        )}
        {threads.map((thread) => (
          <button
            key={thread.registrantId}
            onClick={() => setActive(thread.registrantId)}
            className={cn(
              "block w-full border-b border-hairline px-3 py-2.5 text-left",
              active === thread.registrantId ? "bg-hairline" : "hover:bg-surface-2"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="truncate text-[12.5px] font-medium text-ink">{thread.name}</span>
              {thread.unread > 0 && (
                <span className="rounded-full bg-accent px-1.5 text-[10px] text-white">{thread.unread}</span>
              )}
            </div>
            <p className="truncate text-[11.5px] text-ink-muted">{thread.lastMessage}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col bg-[#0F0F16]">
        {!active ? (
          <p className="m-auto text-[12.5px] text-ink-muted">Select a conversation</p>
        ) : (
          <>
            <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[75%] rounded-lg px-3 py-1.5 text-[12.5px]",
                    message.sender_type === "host"
                      ? "ml-auto bg-accent/20 text-ink"
                      : "bg-hairline text-[#E5E5EA]"
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
              className="flex items-center gap-2 border-t border-surface-3 p-2.5"
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Reply privately…"
                className="flex-1 rounded-lg border border-surface-3 bg-surface-2 px-3 py-2 text-[12.5px] text-ink focus:border-accent focus:outline-none"
              />
              <button type="submit" className="text-accent hover:text-accent-soft">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
