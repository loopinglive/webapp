import type { Metadata } from "next";

import { PageHeader } from "@/components/dashboard/page-header";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <PageHeader title="Settings" subtitle="Account and workspace preferences." />
      <div className="px-6 py-8 lg:px-10">
        <GlassPanel className="max-w-xl p-7">
          <h2 className="text-[15px] font-semibold tracking-tight">Account</h2>
          <label className="mt-5 block text-[12.5px] text-ink-muted">
            Email
            <Input
              className="mt-2"
              defaultValue={user?.email ?? ""}
              readOnly
              disabled
            />
          </label>
        </GlassPanel>
      </div>
    </>
  );
}
