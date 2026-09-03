"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertTriangle, Check, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "warning" | "info";

type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
};

const MAX_VISIBLE = 5;
const DISMISS_AFTER = 4000;

const TONE: Record<
  ToastKind,
  {
    colour: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  }
> = {
  success: { colour: "#00C851", icon: Check },
  error: { colour: "#FF5A5A", icon: X },
  warning: { colour: "#FFB020", icon: AlertTriangle },
  info: { colour: "#6C47FF", icon: Info },
};

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current++;
    setToasts((current) => {
      const next = [...current, { id, kind, message }];
      // Oldest goes when the stack is full, so the newest is always visible.
      return next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next;
    });
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
      warning: (message) => push("warning", message),
      info: (message) => push("info", message),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div
        // Polite: a toast should not interrupt whatever a screen reader is
        // already saying, but it must be announced.
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
      >
        {toasts.map((toast) => (
          <ToastRow key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastRow({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  const tone = TONE[toast.kind];
  const Icon = tone.icon;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), DISMISS_AFTER);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className="pointer-events-auto flex animate-[toast-in_200ms_ease-out] items-start gap-3 rounded-xl border border-[#23232F] bg-[#12121A] p-3.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,.7)]"
      style={{ borderLeftColor: tone.colour, borderLeftWidth: 3 }}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: tone.colour }} />
      <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-[#E4E4EC]">
        {toast.message}
      </p>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss"
        className="shrink-0 rounded-md p-0.5 text-[#6E6E80] transition-colors hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * Toast API.
 *
 * Falls back to a no-op outside the provider so a component can call
 * `toast.error(...)` without knowing whether it is mounted inside the
 * dashboard or on a public page.
 */
export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  return (
    context ?? {
      success: () => {},
      error: () => {},
      warning: () => {},
      info: () => {},
    }
  );
}
