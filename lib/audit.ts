import "server-only";

import { clientIp } from "@/lib/ratelimit";
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

const SENSITIVE_KEY = /password|secret|token|api_?key|private_key|certificate|stream_key|card_number|cvv/i;

function redact(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY.test(key) ? "[redacted]" : redact(val);
    }
    return out;
  }
  return value;
}

export type AuditParams = {
  action: string;
  resourceType: string;
  resourceId?: string | null;
  userId?: string | null;
  teamId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  request?: Request;
};

/**
 * Records an auditable action.
 *
 * Fails silently — a broken audit write must never fail the action it is
 * describing. Keys that look sensitive (password, token, secret, stream key,
 * card number...) are redacted in old_value/new_value before they reach the
 * database, per the Phase 14 audit log rules.
 */
export async function logAudit(params: AuditParams): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase.from("audit_logs").insert({
      user_id: params.userId ?? null,
      team_id: params.teamId ?? null,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId ?? null,
      old_value: params.oldValue !== undefined ? (redact(params.oldValue) as Json) : null,
      new_value: params.newValue !== undefined ? (redact(params.newValue) as Json) : null,
      ip_address: params.request ? clientIp(params.request) : null,
      user_agent: params.request?.headers.get("user-agent") ?? null,
    });
  } catch {
    // Never block the action it describes.
  }
}
