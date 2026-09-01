import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Overview" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={user?.email ? `Signed in as ${user.email}` : undefined}
        action={
          <Link href="/webinars">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              New webinar
            </Button>
          </Link>
        }
      />

      <div className="space-y-6 px-6 py-8 lg:px-10">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Registrations" value="0" hint="Across all webinars" />
          <StatCard label="Attendance rate" value="—" hint="Attended ÷ registered" />
          <StatCard label="Avg. watch depth" value="—" hint="Of total runtime" />
          <StatCard label="Revenue" value="$0" hint="Internal checkouts" />
        </div>

        <EmptyState
          title="No webinars yet"
          body="Upload a recording, set a schedule, and Loopinglive will run it as a live room on repeat."
          action={
            <Link href="/webinars">
              <Button>Create your first webinar</Button>
            </Link>
          }
        />
      </div>
    </>
  );
}
