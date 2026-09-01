import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-11 w-full rounded-xl border border-white/10 bg-surface-2/70 px-4 text-sm text-ink",
      "placeholder:text-ink-faint transition-colors duration-200",
      "focus:border-accent/60 focus:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-accent/25",
      className
    )}
    {...props}
  />
));

Input.displayName = "Input";
