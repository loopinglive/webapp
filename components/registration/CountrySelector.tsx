"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { useIsHydrated } from "@/hooks/useIsHydrated";
import { COUNTRIES, flagFor, type Country } from "@/lib/countries";
import { cn } from "@/lib/utils";

type Props = {
  value: Country;
  onChange: (country: Country) => void;
  name?: string;
};

export function CountrySelector({ value, onChange, name = "countryCode" }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Rule 7: the server renders a plain <select>, so the form still works with
  // JavaScript off. The searchable combobox replaces it once we hydrate.
  const hydrated = useIsHydrated();

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return COUNTRIES;
    return COUNTRIES.filter(
      (country) =>
        country.name.toLowerCase().includes(needle) ||
        country.code.toLowerCase().includes(needle) ||
        country.dial.includes(needle)
    );
  }, [query]);

  if (!hydrated) {
    return (
      <select
        name={name}
        defaultValue={value.code}
        aria-label="Country"
        className="h-[52px] shrink-0 rounded-lg border border-[#1E1E2E] bg-[#12121A] px-3 text-sm text-white outline-none"
      >
        {COUNTRIES.map((country) => (
          <option key={country.code} value={country.code}>
            {flagFor(country.code)} {country.dial} {country.name}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <input type="hidden" name={name} value={value.code} />

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex h-[52px] items-center gap-1.5 rounded-lg border border-[#1E1E2E] bg-[#12121A] px-3 text-sm text-white",
          "transition-colors duration-200 hover:border-[#6C47FF]/50",
          "focus:border-[#6C47FF] focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/25",
          open && "border-[#6C47FF]"
        )}
      >
        <span className="text-lg leading-none">{flagFor(value.code)}</span>
        <span className="tabular-nums">{value.dial}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-[#A0A0B0] transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-[320px] overflow-hidden rounded-xl border border-[#1E1E2E] bg-[#12121A]/95 shadow-[0_32px_80px_-24px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
          <div className="flex items-center gap-2 border-b border-[#1E1E2E] px-3.5 py-3">
            <Search className="h-3.5 w-3.5 text-[#A0A0B0]" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search countries"
              className="w-full bg-transparent text-sm text-white placeholder:text-[#A0A0B0]/70 focus:outline-none"
            />
          </div>

          <ul role="listbox" className="max-h-[264px] overflow-y-auto py-1.5">
            {results.map((country) => {
              const selected = country.code === value.code;
              return (
                <li key={country.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(country);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm transition-colors",
                      selected
                        ? "bg-[#6C47FF]/15 text-white"
                        : "text-[#A0A0B0] hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <span className="text-lg leading-none">
                      {flagFor(country.code)}
                    </span>
                    <span className="flex-1 truncate">{country.name}</span>
                    <span className="tabular-nums text-[#A0A0B0]">
                      {country.dial}
                    </span>
                    {selected && <Check className="h-3.5 w-3.5 text-[#6C47FF]" />}
                  </button>
                </li>
              );
            })}

            {!results.length && (
              <li className="px-3.5 py-6 text-center text-[13px] text-[#A0A0B0]">
                No country matches “{query}”.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
