"use client";

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const base = cn(
  "w-full rounded-lg border border-surface-3 bg-surface-2 px-3.5 text-[13.5px] text-ink",
  "placeholder:text-ink-muted/50 transition-colors duration-200",
  "hover:border-surface-3",
  "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20",
  "disabled:opacity-50"
);

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-[12px] font-medium text-ink-muted">
          {label}
          {required && <span className="ml-1 text-accent">*</span>}
        </span>
        {hint && <span className="text-[11px] text-ink-muted/60">{hint}</span>}
      </span>
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1.5 text-[11.5px] text-[#FF3B3B]">{error}</p>}
    </label>
  );
}

export const TextInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(base, "h-11", className)} {...props} />
));
TextInput.displayName = "TextInput";

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(base, "resize-y py-2.5", className)} {...props} />
));
TextArea.displayName = "TextArea";

export function AdminButton({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const variants = {
    primary:
      "bg-accent text-white hover:bg-accent-soft shadow-[0_8px_28px_-10px_#6C47FF]",
    secondary: "border border-surface-3 bg-surface-2 text-ink hover:border-surface-3",
    ghost: "text-ink-muted hover:bg-surface-2 hover:text-ink",
    danger: "border border-[#FF3B3B]/40 text-[#FF3B3B] hover:bg-[#FF3B3B]/10",
  };

  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-[13px] font-medium",
        "transition-all duration-200 active:scale-[0.98]",
        "disabled:pointer-events-none disabled:opacity-45",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
