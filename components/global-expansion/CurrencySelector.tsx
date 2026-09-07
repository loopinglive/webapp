"use client";

const COUNTRIES = [
  { code: "US", flag: "🇺🇸", label: "United States (USD)" },
  { code: "GB", flag: "🇬🇧", label: "United Kingdom (GBP)" },
  { code: "NG", flag: "🇳🇬", label: "Nigeria (USD)" },
  { code: "GH", flag: "🇬🇭", label: "Ghana (USD)" },
  { code: "KE", flag: "🇰🇪", label: "Kenya (USD)" },
  { code: "ZA", flag: "🇿🇦", label: "South Africa (ZAR)" },
  { code: "IN", flag: "🇮🇳", label: "India (INR)" },
  { code: "BR", flag: "🇧🇷", label: "Brazil (BRL)" },
];

export function CurrencySelector({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (countryCode: string | null) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-[12.5px] text-ink-muted">
      <span className="sr-only">Pricing region</span>
      <select
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        className="h-9 rounded-lg border border-hairline bg-surface px-2.5 text-[12.5px] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <option value="">Detect automatically</option>
        {COUNTRIES.map((country) => (
          <option key={country.code} value={country.code}>
            {country.flag} {country.label}
          </option>
        ))}
      </select>
    </label>
  );
}
