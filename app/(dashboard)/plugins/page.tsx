"use client";

import { useState } from "react";
import Link from "next/link";

import { InstalledPlugins } from "@/components/plugins/InstalledPlugins";
import { PluginMarketplace } from "@/components/plugins/PluginMarketplace";
import { PageHeader } from "@/components/dashboard/page-header";

const TABS = ["Marketplace", "Installed"] as const;

export default function PluginsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Marketplace");

  return (
    <>
      <PageHeader
        title="Plugins"
        subtitle="Extend Loopinglive with third-party functionality."
        action={
          <Link
            href="/plugins/develop"
            className="inline-flex h-9 items-center rounded-full border border-hairline px-4 text-[12.5px] font-medium text-ink-muted hover:text-ink"
          >
            Developer portal
          </Link>
        }
      />
      <div className="px-6 py-8 lg:px-10">
        <div className="flex gap-2">
          {TABS.map((option) => (
            <button
              key={option}
              onClick={() => setTab(option)}
              className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                tab === option ? "bg-accent text-white" : "border border-hairline text-ink-muted hover:text-ink"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "Marketplace" ? <PluginMarketplace /> : <InstalledPlugins />}
        </div>
      </div>
    </>
  );
}
