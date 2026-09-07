"use client";

import { useCallback, useEffect, useState } from "react";

export type CertificateDesign = {
  headline: string;
  subheadline: string;
  signature_name: string;
  signature_title: string;
  accent_colour: string;
  background_colour: string;
  logo_url?: string | null;
};

const DEFAULT_DESIGN: CertificateDesign = {
  headline: "Certificate of Attendance",
  subheadline: "This certifies that",
  signature_name: "",
  signature_title: "",
  accent_colour: "#6C47FF",
  background_colour: "#0A0A0F",
  logo_url: null,
};

export function useCertificateTemplate() {
  const [design, setDesign] = useState<CertificateDesign>(DEFAULT_DESIGN);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/certificate-templates", { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as {
        templates: { design: CertificateDesign; is_default: boolean }[];
      };
      const existing = payload.templates.find((t) => t.is_default) ?? payload.templates[0];
      if (existing) setDesign({ ...DEFAULT_DESIGN, ...existing.design });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const update = useCallback(<K extends keyof CertificateDesign>(key: K, value: CertificateDesign[K]) => {
    setDesign((prev) => ({ ...prev, [key]: value }));
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/certificate-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(design),
      });
      if (!response.ok) {
        setError("Could not save the template.");
        return;
      }
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }, [design]);

  return { design, update, loading, saving, savedAt, error, save };
}
