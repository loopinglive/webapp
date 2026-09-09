"use client";

import Link from "next/link";
import { Loader2, Plus } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { useScriptList } from "@/hooks/useScriptWriter";

export function ScriptListPage() {
  const { scripts } = useScriptList();

  return (
    <div className="px-6 py-6 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">
          Script writer
        </h1>
        <Link
          href="/script-writer/new"
          className="inline-flex h-9 items-center gap-2 rounded-full bg-accent px-3.5 text-[13px] font-medium text-white hover:bg-accent-deep"
        >
          <Plus className="h-3.5 w-3.5" />
          New script
        </Link>
      </div>

      <div className="mt-6">
        {!scripts ? (
          <div className="grid h-40 place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
          </div>
        ) : scripts.length === 0 ? (
          <EmptyState
            icon="📝"
            title="No scripts yet"
            description="Generate a full word-for-word webinar script from a topic."
          />
        ) : (
          <ul className="space-y-2">
            {scripts.map((script) => (
              <li key={script.id}>
                <Link
                  href={`/script-writer/${script.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-surface px-4 py-3 hover:border-accent/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] text-ink">
                      {script.title}
                    </span>
                    <span className="block text-[11.5px] text-ink-faint">
                      {script.webinar_length_minutes} min ·{" "}
                      {script.webinar_id ? "linked to a webinar" : script.status}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
