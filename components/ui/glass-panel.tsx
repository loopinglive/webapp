import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  strong?: boolean;
}

export function GlassPanel({ className, strong, ...props }: GlassPanelProps) {
  return (
    <div
      className={cn(
        strong ? "glass-strong" : "glass",
        "rounded-panel",
        className
      )}
      {...props}
    />
  );
}
