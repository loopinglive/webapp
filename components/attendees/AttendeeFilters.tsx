"use client";

import { useState } from "react";
import { Download, Loader2, Search } from "lucide-react";

import { AdminButton, TextInput } from "@/components/admin/ui/Field";

export function AttendeeFilters({
  webinarId,
  segment,
  search,
  onSearchChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
}: {
  webinarId: string;
  segment: string;
  search: string;
  onSearchChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
}) {
  const [exporting, setExporting] = useState(false);

  /**
   * Fetch then blob rather than a plain link: the route needs the admin's
   * session cookie and returns a Content-Disposition, and this way a failure
   * surfaces instead of navigating away to an error page.
   */
  async function exportCsv() {
    setExporting(true);
    try {
      const params = new URLSearchParams({ webinarId });
      if (segment !== "all") params.set("segment", segment);

      const response = await fetch(`/api/admin/attendees/export?${params}`);
      if (!response.ok) return;

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const name =
        disposition.match(/filename="(.+?)"/)?.[1] ?? "attendees.csv";

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-full border border-[#1E1E2E] bg-[#12121A] px-4 py-2 focus-within:border-[#6C47FF]/60">
        <Search className="h-3.5 w-3.5 shrink-0 text-[#A0A0B0]" />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search name, email or phone"
          aria-label="Search attendees"
          className="w-full bg-transparent text-[12.5px] text-white placeholder:text-[#A0A0B0]/60 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-1.5">
        <TextInput
          type="date"
          value={dateFrom}
          onChange={(event) => onDateFromChange(event.target.value)}
          aria-label="Registered from"
          className="h-10 w-[150px]"
        />
        <span className="text-[12px] text-[#A0A0B0]">to</span>
        <TextInput
          type="date"
          value={dateTo}
          onChange={(event) => onDateToChange(event.target.value)}
          aria-label="Registered to"
          className="h-10 w-[150px]"
        />
      </div>

      <AdminButton variant="secondary" onClick={exportCsv} disabled={exporting}>
        {exporting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        Export CSV
      </AdminButton>
    </div>
  );
}
