"use client";

import { useCallback, useEffect, useState } from "react";

import type { ScheduledMessageRow } from "@/types/database";

export type LogStats = {
  total: number;
  sent: number;
  pending: number;
  failed: number;
  cancelled: number;
  email: number;
  sms: number;
  whatsapp: number;
};

const EMPTY: LogStats = {
  total: 0,
  sent: 0,
  pending: 0,
  failed: 0,
  cancelled: 0,
  email: 0,
  sms: 0,
  whatsapp: 0,
};

export function useMessageLogs(webinarId: string) {
  const [logs, setLogs] = useState<ScheduledMessageRow[]>([]);
  const [stats, setStats] = useState<LogStats>(EMPTY);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams({
      webinarId,
      channel,
      status,
      page: String(page),
    });
    if (search) params.set("search", search);

    try {
      const response = await fetch(`/api/admin/automation/logs?${params}`, {
        cache: "no-store",
      });
      if (response.ok) {
        const payload = (await response.json()) as {
          logs: ScheduledMessageRow[];
          total: number;
          totalPages: number;
          stats: LogStats;
        };
        setLogs(payload.logs);
        setTotal(payload.total);
        setTotalPages(payload.totalPages);
        setStats(payload.stats);
      }
    } finally {
      setIsLoading(false);
    }
  }, [webinarId, channel, status, page, search]);

  useEffect(() => {
    const id = setTimeout(() => void load(), search ? 300 : 0);
    return () => clearTimeout(id);
  }, [load, search]);

  const retry = useCallback(
    async (messageId: string) => {
      await fetch("/api/admin/automation/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
      await load();
    },
    [load]
  );

  return {
    logs,
    stats,
    total,
    totalPages,
    page,
    setPage,
    channel,
    setChannel: (value: string) => {
      setChannel(value);
      setPage(1);
    },
    status,
    setStatus: (value: string) => {
      setStatus(value);
      setPage(1);
    },
    search,
    setSearch: (value: string) => {
      setSearch(value);
      setPage(1);
    },
    isLoading,
    retry,
    refresh: load,
  };
}
