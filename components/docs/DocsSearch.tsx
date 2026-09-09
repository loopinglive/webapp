"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";

type Result = { slug: string; title: string; category: string; excerpt: string };

function toSlug(category: string) {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Full-text docs search, opened by clicking the field or pressing Ctrl/Cmd+K. */
export function DocsSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    if (query.trim().length < 2) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      const response = await fetch(`/api/docs/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const payload = (await response.json()) as { results: Result[] };
        setResults(payload.results);
      }
      setLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const visibleResults = query.trim().length < 2 ? [] : results;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-10 w-full items-center gap-2.5 rounded-xl border border-hairline bg-surface px-3.5 text-[13px] text-ink-faint transition-colors hover:border-accent/40 sm:w-72"
      >
        <Search className="h-3.5 w-3.5" />
        Search docs
        <kbd className="ml-auto rounded border border-hairline px-1.5 py-0.5 text-[10.5px]">⌘K</kbd>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Search documentation"
          className="fixed inset-0 z-[200] grid place-items-start justify-center bg-black/60 p-4 pt-[12vh]"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-hairline bg-surface"
          >
            <div className="flex items-center gap-2.5 border-b border-hairline px-4 py-3">
              <Search className="h-4 w-4 text-ink-faint" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search documentation…"
                className="h-6 w-full bg-transparent text-[14px] text-ink placeholder:text-ink-faint focus:outline-none"
              />
              {loading && <Loader2 className="h-4 w-4 animate-spin text-ink-faint" />}
            </div>

            {visibleResults.length > 0 && (
              <ul className="max-h-96 overflow-y-auto py-2">
                {visibleResults.map((result) => (
                  <li key={result.slug}>
                    <button
                      onClick={() => {
                        setOpen(false);
                        router.push(`/docs/${toSlug(result.category)}/${result.slug}`);
                      }}
                      className="block w-full px-4 py-2.5 text-left transition-colors hover:bg-surface-2"
                    >
                      <p className="text-[13px] font-medium text-ink">{result.title}</p>
                      <p className="mt-0.5 line-clamp-1 text-[12px] text-ink-faint">{result.excerpt}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {query.trim().length >= 2 && !loading && visibleResults.length === 0 && (
              <p className="px-4 py-6 text-center text-[13px] text-ink-faint">
                No pages match &ldquo;{query}&rdquo;.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
