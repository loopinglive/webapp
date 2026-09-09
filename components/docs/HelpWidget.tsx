"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { HelpCircle, Loader2, Search, X } from "lucide-react";

type Result = { slug: string; title: string; category: string; excerpt: string };

function toSlug(category: string) {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Maps a dashboard route to the docs page most likely to help there. */
function suggestedDocFor(pathname: string): { href: string; label: string } | null {
  if (pathname.startsWith("/admin/webinar")) {
    if (pathname.includes("/personas")) return { href: "/docs/setting-up-your-webinar/creating-fake-personas", label: "Creating Fake Personas" };
    if (pathname.includes("/comments")) return { href: "/docs/setting-up-your-webinar/timed-comments", label: "Timed Comments" };
    if (pathname.includes("/streaming")) return { href: "/docs/plugins/plugin-api-reference", label: "Plugin API Reference" };
    return { href: "/docs/getting-started/quick-start-guide", label: "Quick Start Guide" };
  }
  if (pathname.startsWith("/analytics")) return { href: "/docs/analytics/understanding-your-dashboard", label: "Understanding Your Dashboard" };
  if (pathname.startsWith("/settings/billing") || pathname.startsWith("/upgrade")) {
    return { href: "/docs/billing/plans-and-pricing", label: "Plans and Pricing" };
  }
  if (pathname.startsWith("/plugins")) return { href: "/docs/plugins/plugin-developer-guide", label: "Plugin Developer Guide" };
  if (pathname.startsWith("/team")) return { href: "/docs/team-and-enterprise/team-accounts", label: "Team Accounts" };
  return null;
}

/** The "?" help button every dashboard page carries — search-first, docs-backed. */
export function HelpWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);

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
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const visibleResults = query.trim().length < 2 ? [] : results;
  const suggestion = suggestedDocFor(pathname);

  return (
    <div className="fixed bottom-5 left-5 z-[150]">
      {open && (
        <div className="glass-strong mb-3 w-[300px] rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[13.5px] font-semibold text-ink">Help</h2>
            <button onClick={() => setOpen(false)} aria-label="Close help" className="text-ink-faint hover:text-ink">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <label className="mt-3 flex items-center gap-2 rounded-lg border border-hairline bg-surface px-3 py-2">
            <Search className="h-3.5 w-3.5 text-ink-faint" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search documentation…"
              className="h-5 w-full bg-transparent text-[12.5px] text-ink placeholder:text-ink-faint focus:outline-none"
            />
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-faint" />}
          </label>

          {suggestion && !query && (
            <Link
              href={suggestion.href}
              className="mt-3 block rounded-lg bg-accent/10 px-3 py-2 text-[12.5px] text-accent-soft hover:bg-accent/15"
            >
              Relevant here: {suggestion.label}
            </Link>
          )}

          {visibleResults.length > 0 && (
            <ul className="mt-2 max-h-56 space-y-0.5 overflow-y-auto">
              {visibleResults.map((result) => (
                <li key={result.slug}>
                  <Link
                    href={`/docs/${toSlug(result.category)}/${result.slug}`}
                    className="block rounded-lg px-2.5 py-2 text-[12.5px] text-ink-muted hover:bg-surface-2 hover:text-ink"
                  >
                    {result.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/docs"
            className="mt-3 block border-t border-hairline pt-3 text-center text-[12px] text-ink-faint hover:text-ink-muted"
          >
            Open full docs
          </Link>
        </div>
      )}

      <button
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Help"
        className="glass-strong grid h-11 w-11 place-items-center rounded-full text-ink transition-colors hover:text-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <HelpCircle className="h-4.5 w-4.5" />
      </button>
    </div>
  );
}
