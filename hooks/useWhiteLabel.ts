"use client";

import { useCallback, useEffect, useState } from "react";

export type WhiteLabelForm = {
  brand_name: string;
  brand_logo_url: string | null;
  brand_favicon_url: string | null;
  primary_colour: string;
  secondary_colour: string;
  background_colour: string;
  custom_domain: string | null;
  custom_domain_verified: boolean;
  hide_loopinglive_branding: boolean;
  custom_login_page_headline: string | null;
  custom_login_page_subheadline: string | null;
  custom_support_email: string | null;
  custom_terms_url: string | null;
  custom_privacy_url: string | null;
  email_from_name: string | null;
  email_from_address: string | null;
  use_custom_smtp: boolean;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_username: string | null;
};

const DEFAULTS: WhiteLabelForm = {
  brand_name: "",
  brand_logo_url: null,
  brand_favicon_url: null,
  primary_colour: "#6C47FF",
  secondary_colour: "#00D4FF",
  background_colour: "#0A0A0F",
  custom_domain: null,
  custom_domain_verified: false,
  hide_loopinglive_branding: true,
  custom_login_page_headline: null,
  custom_login_page_subheadline: null,
  custom_support_email: null,
  custom_terms_url: null,
  custom_privacy_url: null,
  email_from_name: null,
  email_from_address: null,
  use_custom_smtp: false,
  smtp_host: null,
  smtp_port: null,
  smtp_username: null,
};

export function useWhiteLabel() {
  const [form, setForm] = useState<WhiteLabelForm>(DEFAULTS);
  const [entitled, setEntitled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/white-label/config", { cache: "no-store" });
    const payload = await response.json();
    if (payload.config) setForm((prev) => ({ ...prev, ...payload.config }));
    setEntitled(payload.entitled ?? true);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const update = useCallback(<K extends keyof WhiteLabelForm>(key: K, value: WhiteLabelForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const save = useCallback(
    async (smtpPassword?: string) => {
      setSaving(true);
      setError(null);

      const response = await fetch("/api/white-label/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, smtp_password: smtpPassword || undefined }),
      });

      setSaving(false);

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error ?? "Could not save.");
        return false;
      }

      setSavedAt(Date.now());
      return true;
    },
    [form]
  );

  const verifyDomain = useCallback(async () => {
    setVerifying(true);
    const response = await fetch("/api/white-label/verify-domain", { method: "POST" });
    const payload = await response.json();
    setVerifying(false);
    // Mirrors both ways: a domain that stops resolving, or one detached at
    // the edge, must not keep showing as live.
    setForm((prev) => ({ ...prev, custom_domain_verified: Boolean(payload.verified) }));
    return payload as {
      verified: boolean;
      expected: string;
      detail: string;
      records?: { type: string; name: string; value: string }[];
    };
  }, []);

  return { form, update, save, verifyDomain, entitled, loading, saving, verifying, error, savedAt };
}
