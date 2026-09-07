"use client";

import { useState } from "react";

import type { WhiteLabelForm } from "@/hooks/useWhiteLabel";

export function SmtpConfig({
  form,
  update,
  onPasswordChange,
}: {
  form: WhiteLabelForm;
  update: <K extends keyof WhiteLabelForm>(key: K, value: WhiteLabelForm[K]) => void;
  onPasswordChange: (value: string) => void;
}) {
  const [password, setPassword] = useState("");

  return (
    <div className="space-y-4">
      <label className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium text-white">Use custom SMTP</p>
          <p className="text-[12px] text-[#6E6E80]">
            Send this host&apos;s automated emails through their own server instead of Loopinglive&apos;s.
          </p>
        </div>
        <input
          type="checkbox"
          checked={form.use_custom_smtp}
          onChange={(event) => update("use_custom_smtp", event.target.checked)}
          className="h-5 w-9 shrink-0 accent-[#6C47FF]"
        />
      </label>

      {form.use_custom_smtp && (
        <div className="grid grid-cols-2 gap-3">
          <input
            value={form.smtp_host ?? ""}
            onChange={(event) => update("smtp_host", event.target.value)}
            placeholder="SMTP host"
            className="rounded-lg border border-[#1E1E2E] bg-[#1A1A24] px-3 py-2.5 text-[13px] text-white placeholder:text-[#6E6E80] focus:border-[#6C47FF] focus:outline-none"
          />
          <input
            type="number"
            value={form.smtp_port ?? ""}
            onChange={(event) => update("smtp_port", Number(event.target.value) || null)}
            placeholder="Port (587)"
            className="rounded-lg border border-[#1E1E2E] bg-[#1A1A24] px-3 py-2.5 text-[13px] text-white placeholder:text-[#6E6E80] focus:border-[#6C47FF] focus:outline-none"
          />
          <input
            value={form.smtp_username ?? ""}
            onChange={(event) => update("smtp_username", event.target.value)}
            placeholder="Username"
            className="rounded-lg border border-[#1E1E2E] bg-[#1A1A24] px-3 py-2.5 text-[13px] text-white placeholder:text-[#6E6E80] focus:border-[#6C47FF] focus:outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              onPasswordChange(event.target.value);
            }}
            placeholder="Password"
            className="rounded-lg border border-[#1E1E2E] bg-[#1A1A24] px-3 py-2.5 text-[13px] text-white placeholder:text-[#6E6E80] focus:border-[#6C47FF] focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
