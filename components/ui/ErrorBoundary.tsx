"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";

type Props = {
  children: ReactNode;
  /** Named so a log row says which part of the page failed. */
  area?: string;
  /** Smaller treatment for a panel inside a page. */
  compact?: boolean;
  fallback?: ReactNode;
};

type State = { hasError: boolean };

/**
 * Contains a render failure to one region.
 *
 * Applied per section rather than around the whole app on purpose: a chart
 * that throws should cost the reader that chart, not the dashboard.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Reported without awaiting, and never allowed to throw — an error inside
    // error reporting would replace a contained failure with a broken app.
    try {
      void fetch("/api/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorType: this.props.area ?? "render",
          errorMessage: error.message,
          stackTrace: `${error.stack ?? ""}\n--- component stack ---${info.componentStack ?? ""}`.slice(0, 8000),
          pageUrl: typeof window === "undefined" ? null : window.location.href,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* reporting is best-effort */
    }
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    if (this.props.compact) {
      return (
        <div className="flex items-center gap-3 rounded-xl border border-[#23232F] bg-[#12121A] px-4 py-5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-[#FFB020]" />
          <p className="flex-1 text-[13px] text-[#A0A0B0]">
            This section could not be displayed.
          </p>
          <button
            onClick={this.reset}
            className="shrink-0 text-[12.5px] text-[#6C47FF] hover:text-[#8A6BFF]"
          >
            Retry
          </button>
        </div>
      );
    }

    return (
      <div className="grid min-h-[50dvh] place-items-center px-6 py-16">
        <div className="max-w-[42ch] text-center">
          <span className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-[#FFB020]/12">
            <AlertTriangle className="h-5 w-5 text-[#FFB020]" />
          </span>

          <h2 className="mt-4 text-[20px] font-semibold tracking-[-0.02em] text-white">
            Something went wrong
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[#A0A0B0]">
            We have been notified and are looking into it. Nothing you had saved is
            affected.
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={this.reset}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-[#6C47FF] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#7C5AFF]"
            >
              <RotateCw className="h-3.5 w-3.5" />
              Try again
            </button>
            <Link
              href="/dashboard"
              className="text-[13px] text-[#A0A0B0] transition-colors hover:text-white"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
