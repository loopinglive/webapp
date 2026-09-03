"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Receipt, Search, User, Users } from "lucide-react";

type Result = {
  kind: "user" | "webinar" | "registrant" | "invoice";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

const ICON = {
  user: User,
  webinar: FileText,
  registrant: Users,
  invoice: Receipt,
};

const KIND_LABEL = {
  user: "Account",
  webinar: "Webinar",
  registrant: "Attendee",
  invoice: "Invoice",
};

/**
 * One box that finds anything.
 *
 * Opens on Cmd/Ctrl-K because that is the shortcut this audience already has
 * in muscle memory, and because a support person going through a queue should
 * never have to reach for the mouse to find the next customer.
 */
export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  // Too short to search: nothing is fetched, and `visible` below renders empty
  // without an effect having to clear state.
  const tooShort = query.trim().length < 2;
  const visible = tooShort ? [] : results;

  useEffect(() => {
    if (tooShort) return;

    let cancelled = false;
    // Debounced: every keystroke would otherwise fire four table queries.
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/superadmin/search?q=${encodeURIComponent(query)}`,
          { cache: "no-store" }
        );
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as { results: Result[] };
        setResults(data.results);
        setCursor(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, tooShort]);

  const go = useCallback(
    (result: Result) => {
      setOpen(false);
      setQuery("");
      router.push(result.href);
    },
    [router]
  );

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((c) => Math.min(c + 1, visible.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    }
    if (event.key === "Enter" && visible[cursor]) {
      event.preventDefault();
      go(visible[cursor]);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-xl border border-[#1E1E2E] bg-[#12121A] px-3 py-2 text-left text-[12.5px] text-[#6E6E80] transition-colors hover:border-[#2A2A3A] hover:text-[#A0A0B0]"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1">Search anything</span>
        <kbd className="rounded border border-[#2A2A3A] px-1.5 py-0.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[150] flex items-start justify-center bg-black/75 p-4 pt-[12vh] backdrop-blur-sm">
          <button
            aria-label="Close search"
            onClick={() => setOpen(false)}
            className="absolute inset-0"
          />

          <div className="relative w-full max-w-[560px] overflow-hidden rounded-2xl border border-[#23232F] bg-[#0D0D15] shadow-2xl">
            <div className="flex items-center gap-3 border-b border-[#1E1E2E] px-4">
              <Search className="h-4 w-4 shrink-0 text-[#6E6E80]" />
              <input
                ref={input}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Email, name, webinar title, referral code, invoice id…"
                className="h-14 flex-1 bg-transparent text-[14px] text-white placeholder:text-[#4A4A5C] focus:outline-none"
              />
              {loading && <Loader2 className="h-4 w-4 animate-spin text-[#6C47FF]" />}
            </div>

            <div className="max-h-[52vh] overflow-y-auto">
              {visible.length === 0 ? (
                <p className="px-4 py-8 text-center text-[13px] text-[#6E6E80]">
                  {tooShort
                    ? "Type at least two characters."
                    : loading
                      ? "Searching…"
                      : "Nothing matched."}
                </p>
              ) : (
                visible.map((result, index) => {
                  const Icon = ICON[result.kind];
                  return (
                    <button
                      key={`${result.kind}-${result.id}`}
                      onClick={() => go(result)}
                      onMouseEnter={() => setCursor(index)}
                      className={
                        index === cursor
                          ? "flex w-full items-center gap-3 bg-[#6C47FF]/12 px-4 py-2.5 text-left"
                          : "flex w-full items-center gap-3 px-4 py-2.5 text-left"
                      }
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 text-[#6C47FF]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] text-white">
                          {result.title}
                        </span>
                        <span className="block truncate text-[11.5px] text-[#6E6E80]">
                          {result.subtitle}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-[#4A4A5C]">
                        {KIND_LABEL[result.kind]}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
