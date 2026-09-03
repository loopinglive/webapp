import { NextResponse } from "next/server";

import { requireSuperAdmin } from "@/lib/billing/account";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Escapes the wildcards so a query containing % or _ matches literally. */
const escapeLike = (value: string) => value.replace(/[%_\\]/g, "\\$&");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * One box that resolves anything to the right record.
 *
 * A support conversation always starts with an identifier of some kind — an
 * email, a name, a webinar title, an id pasted from a Stripe receipt. This
 * looks in every place one could come from and returns whatever matched,
 * rather than making someone guess which page to search on.
 */
export async function GET(request: Request) {
  const { response: denied } = await requireSuperAdmin();
  if (denied) return denied;

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ results: [] });

  const like = `%${escapeLike(query)}%`;
  const supabase = createServiceClient();

  const [accounts, webinarRows, registrantRows, invoiceRows] = await Promise.all([
    supabase
      .from("user_accounts")
      .select("id, full_name, email, plan_slug, is_suspended")
      .or(`email.ilike.${like},full_name.ilike.${like},referral_code.ilike.${like}`)
      .limit(8),

    supabase
      .from("webinars")
      .select("id, title, owner_id, status")
      .ilike("title", like)
      .limit(8),

    // Registrants are the host's data, so a match here resolves to the host —
    // an admin searching an attendee address wants the account behind it.
    supabase
      .from("registrants")
      .select("id, email, full_name, webinar_id")
      .ilike("email", like)
      .limit(8),

    UUID.test(query)
      ? supabase
          .from("invoices")
          .select("id, user_id, amount, currency, plan_slug, status")
          .eq("id", query)
          .limit(5)
      : Promise.resolve({ data: [] }),
  ]);

  // Resolve webinar owners so every result can link to a person.
  const ownerIds = [
    ...new Set([
      ...(webinarRows.data ?? []).map((w) => w.owner_id).filter(Boolean),
      ...(invoiceRows.data ?? []).map((i) => i.user_id).filter(Boolean),
    ]),
  ] as string[];

  const { data: owners } = ownerIds.length
    ? await supabase.from("user_accounts").select("id, full_name, email").in("id", ownerIds)
    : { data: [] };

  const ownerById = new Map((owners ?? []).map((o) => [o.id, o]));

  const webinarIds = [...new Set((registrantRows.data ?? []).map((r) => r.webinar_id))];
  const { data: registrantWebinars } = webinarIds.length
    ? await supabase.from("webinars").select("id, title, owner_id").in("id", webinarIds)
    : { data: [] };

  const webinarById = new Map((registrantWebinars ?? []).map((w) => [w.id, w]));

  return NextResponse.json({
    results: [
      ...(accounts.data ?? []).map((row) => ({
        kind: "user" as const,
        id: row.id,
        title: row.full_name || row.email,
        subtitle: `${row.email} · ${row.plan_slug}${row.is_suspended ? " · suspended" : ""}`,
        href: `/superadmin/users/${row.id}`,
      })),

      ...(webinarRows.data ?? []).map((row) => {
        const owner = row.owner_id ? ownerById.get(row.owner_id) : undefined;
        return {
          kind: "webinar" as const,
          id: row.id,
          title: row.title,
          subtitle: `${row.status} · ${owner?.email ?? "unknown owner"}`,
          href: row.owner_id ? `/superadmin/users/${row.owner_id}` : "/superadmin/users",
        };
      }),

      ...(registrantRows.data ?? []).map((row) => {
        const webinar = webinarById.get(row.webinar_id);
        return {
          kind: "registrant" as const,
          id: row.id,
          title: row.full_name || row.email,
          subtitle: `attendee of "${webinar?.title ?? "unknown"}"`,
          href: webinar?.owner_id
            ? `/superadmin/users/${webinar.owner_id}`
            : "/superadmin/users",
        };
      }),

      ...(invoiceRows.data ?? []).map((row) => ({
        kind: "invoice" as const,
        id: row.id,
        title: `${row.amount} ${row.currency?.toUpperCase()} · ${row.plan_slug}`,
        subtitle: `${row.status} · ${row.user_id ? (ownerById.get(row.user_id)?.email ?? "") : ""}`,
        href: row.user_id ? `/superadmin/users/${row.user_id}` : "/superadmin/users",
      })),
    ],
  });
}
