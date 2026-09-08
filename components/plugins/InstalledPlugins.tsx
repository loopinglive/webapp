"use client";

import { useState } from "react";
import { Settings, Trash2 } from "lucide-react";

import { PluginSettings } from "@/components/plugins/PluginSettings";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { type PluginInstallation, usePlugins } from "@/hooks/usePlugins";

export function InstalledPlugins() {
  const { installations, uninstall } = usePlugins();
  const toast = useToast();
  const [editing, setEditing] = useState<PluginInstallation | null>(null);

  if (!installations) return <SkeletonRows rows={3} columns={3} />;

  if (installations.length === 0) {
    return (
      <EmptyState
        icon="📦"
        title="Nothing installed yet"
        description="Browse the marketplace to add your first plugin."
      />
    );
  }

  return (
    <div>
      <ul className="space-y-2">
        {installations.map((installation) => (
          <li
            key={installation.id}
            className="flex items-center justify-between rounded-xl border border-hairline bg-surface px-4 py-3.5"
          >
            <div>
              <p className="text-[13.5px] font-medium text-ink">{installation.plugin?.name ?? "Unknown plugin"}</p>
              <p className="mt-0.5 text-[11.5px] text-ink-faint">
                {installation.webinar_id ? "This webinar only" : "Every webinar"}
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setEditing(installation)}
                aria-label="Settings"
                className="grid h-8 w-8 place-items-center rounded-lg border border-hairline text-ink-faint transition-colors hover:text-ink"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={async () => {
                  await uninstall(installation.id);
                  toast.success("Uninstalled.");
                }}
                aria-label="Uninstall"
                className="grid h-8 w-8 place-items-center rounded-lg border border-hairline text-ink-faint transition-colors hover:border-[#FF5A5A]/50 hover:text-[#FF5A5A]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {editing && <PluginSettings installation={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
