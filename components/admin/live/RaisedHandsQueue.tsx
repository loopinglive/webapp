"use client";

import { Check, Hand } from "lucide-react";

import { useRaisedHands } from "@/hooks/useRaisedHands";
import { cn } from "@/lib/utils";

export function RaisedHandsQueue({ sessionId }: { sessionId: string | null }) {
  const { queue, acknowledge } = useRaisedHands(sessionId);

  if (!sessionId) return null;
  if (queue.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-surface-3 bg-surface px-4 py-3">
        <Hand className="h-4 w-4 text-ink-muted" />
        <span className="text-[12.5px] text-ink-muted">No hands raised.</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-surface-3 bg-surface p-2">
      {queue.map((hand) => (
        <div
          key={hand.id}
          className={cn(
            "flex items-center justify-between rounded-lg px-3 py-2",
            hand.acknowledged ? "opacity-60" : "bg-accent/10"
          )}
        >
          <div className="flex items-center gap-2">
            <Hand className="h-3.5 w-3.5 text-accent" />
            <span className="text-[12.5px] text-ink">{hand.name}</span>
          </div>
          {!hand.acknowledged && (
            <button
              onClick={() => acknowledge(hand.registrantId)}
              className="flex items-center gap-1 text-[11.5px] font-medium text-accent hover:text-accent-soft"
            >
              <Check className="h-3.5 w-3.5" /> Seen
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
