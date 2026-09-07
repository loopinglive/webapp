"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="group relative mt-4 overflow-hidden rounded-xl border border-hairline bg-[#0A0A10]">
      {language && (
        <div className="flex items-center justify-between border-b border-hairline px-3.5 py-1.5">
          <span className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-ink-faint">
            {language}
          </span>
        </div>
      )}
      <button
        onClick={copy}
        aria-label="Copy code"
        className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-md border border-hairline bg-surface text-ink-faint opacity-0 transition-opacity hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-[#00C851]" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <pre className="overflow-x-auto p-4 text-[12.5px] leading-relaxed text-ink">
        <code>{code}</code>
      </pre>
    </div>
  );
}
