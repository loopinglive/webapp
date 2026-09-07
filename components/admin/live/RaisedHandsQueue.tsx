"use client";

import { Check, Hand } from "lucide-react";

import { useRaisedHands } from "@/hooks/useRaisedHands";
import { cn } from "@/lib/utils";

export function RaisedHandsQueue({ sessionId }: { sessionId: string | null }) {
  const { queue, acknowledge } = useRaisedHands(sessionId);

  if (!sessionId) return null;
  if (queue.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[#2A2A3A] bg-[#12121A] px-4 py-3">
        <Hand className="h-4 w-4 text-[#A0A0B0]" />
        <span className="text-[12.5px] text-[#A0A0B0]">No hands raised.</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-[#2A2A3A] bg-[#12121A] p-2">
      {queue.map((hand) => (
        <div
          key={hand.id}
          className={cn(
            "flex items-center justify-between rounded-lg px-3 py-2",
            hand.acknowledged ? "opacity-60" : "bg-[#6C47FF]/10"
          )}
        >
          <div className="flex items-center gap-2">
            <Hand className="h-3.5 w-3.5 text-[#6C47FF]" />
            <span className="text-[12.5px] text-white">{hand.name}</span>
          </div>
          {!hand.acknowledged && (
            <button
              onClick={() => acknowledge(hand.registrantId)}
              className="flex items-center gap-1 text-[11.5px] font-medium text-[#6C47FF] hover:text-[#7C5AFF]"
            >
              <Check className="h-3.5 w-3.5" /> Seen
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
