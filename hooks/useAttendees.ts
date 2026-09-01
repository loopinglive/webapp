"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { AttendeeListItem } from "@/types";

export function useAttendees(webinarId: string) {
  const [attendees, setAttendees] = useState<AttendeeListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [segment, setSegment] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);

    const params = new URLSearchParams({
      webinarId,
      segment,
      page: String(page),
      sortBy,
      sortOrder,
    });
    if (search) params.set("search", search);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", `${dateTo}T23:59:59`);

    try {
      const response = await fetch(`/api/admin/attendees/list?${params}`, {
        cache: "no-store",
      });
      if (response.ok) {
        const payload = (await response.json()) as {
          attendees: AttendeeListItem[];
          total: number;
          totalPages: number;
        };
        setAttendees(payload.attendees);
        setTotal(payload.total);
        setTotalPages(payload.totalPages);
      }
    } finally {
      setIsLoading(false);
    }
  }, [webinarId, segment, page, search, sortBy, sortOrder, dateFrom, dateTo]);

  // Search is debounced; every other change refetches at once.
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void load(), search ? 300 : 0);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [load, search]);

  const changeSegment = useCallback((next: string) => {
    setSegment(next);
    setPage(1);
  }, []);

  const toggleSort = useCallback(
    (column: string) => {
      if (sortBy === column) {
        setSortOrder((order) => (order === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(column);
        setSortOrder("desc");
      }
      setPage(1);
    },
    [sortBy]
  );

  return {
    attendees,
    total,
    page,
    totalPages,
    setPage,
    segment,
    setSegment: changeSegment,
    search,
    setSearch: (value: string) => {
      setSearch(value);
      setPage(1);
    },
    sortBy,
    sortOrder,
    toggleSort,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    isLoading,
    refetch: load,
  };
}
