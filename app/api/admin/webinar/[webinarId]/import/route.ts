import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { columnIndex, parseCsv } from "@/lib/csv";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX_ROWS = 5000;

type Row = { name: string; email: string; phone: string; country: string };

/**
 * Bulk registrant import.
 *
 * A host arriving with an existing list had no way to bring it in. Imported
 * people are real registrants -- they receive reminders and appear in
 * analytics -- so the response reports exactly what was skipped and why rather
 * than silently dropping rows.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ webinarId: string }> }
) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const { webinarId } = await params;
  const { csv, sessionId, dryRun } = (await request.json().catch(() => ({}))) as {
    csv?: string;
    sessionId?: string;
    dryRun?: boolean;
  };

  if (!csv?.trim()) {
    return NextResponse.json({ error: "Paste or upload a CSV first." }, { status: 400 });
  }

  const rows = parseCsv(csv);
  if (rows.length < 2) {
    return NextResponse.json(
      { error: "That looks empty — a header row plus at least one person is needed." },
      { status: 422 }
    );
  }

  const header = rows[0];
  const emailAt = columnIndex(header, ["email", "emailaddress", "e"]);
  const nameAt = columnIndex(header, ["name", "fullname", "firstname"]);
  const phoneAt = columnIndex(header, ["phone", "phonenumber", "mobile"]);
  const countryAt = columnIndex(header, ["country", "countrycode"]);

  if (emailAt === -1) {
    return NextResponse.json(
      { error: `No email column found. Headings seen: ${header.join(", ")}` },
      { status: 422 }
    );
  }

  const body = rows.slice(1, MAX_ROWS + 1);
  const seen = new Set<string>();
  const valid: Row[] = [];
  const skipped: { row: number; reason: string }[] = [];

  body.forEach((cells, index) => {
    const email = (cells[emailAt] ?? "").trim().toLowerCase();

    if (!email) {
      skipped.push({ row: index + 2, reason: "no email" });
      return;
    }
    if (!EMAIL.test(email)) {
      skipped.push({ row: index + 2, reason: `"${email}" is not a valid address` });
      return;
    }
    // Duplicates inside the file itself, before the database sees them.
    if (seen.has(email)) {
      skipped.push({ row: index + 2, reason: "duplicate in this file" });
      return;
    }
    seen.add(email);

    valid.push({
      email,
      name: (nameAt !== -1 ? cells[nameAt] : "")?.trim() || email.split("@")[0],
      phone: (phoneAt !== -1 ? cells[phoneAt] : "")?.trim() || "",
      country: (countryAt !== -1 ? cells[countryAt] : "")?.trim().toUpperCase() || "",
    });
  });

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("registrants")
    .select("email")
    .eq("webinar_id", webinarId)
    .in("email", valid.map((v) => v.email));

  const already = new Set((existing ?? []).map((r) => r.email));
  const fresh = valid.filter((v) => !already.has(v.email));

  for (const person of valid) {
    if (already.has(person.email)) {
      skipped.push({ row: 0, reason: `${person.email} is already registered` });
    }
  }

  // A dry run is the default path in the UI: importing a thousand people is
  // not something to discover you got wrong afterwards.
  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      wouldImport: fresh.length,
      alreadyRegistered: already.size,
      skipped: skipped.slice(0, 50),
      skippedTotal: skipped.length,
      sample: fresh.slice(0, 5),
      truncated: rows.length - 1 > MAX_ROWS,
    });
  }

  if (fresh.length === 0) {
    return NextResponse.json({
      imported: 0,
      alreadyRegistered: already.size,
      skipped: skipped.slice(0, 50),
      skippedTotal: skipped.length,
    });
  }

  const { error } = await supabase.from("registrants").insert(
    fresh.map((person) => ({
      webinar_id: webinarId,
      session_id: sessionId ?? null,
      full_name: person.name,
      email: person.email,
      phone: person.phone,
      country_code: person.country,
      country_flag: "",
    }))
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    imported: fresh.length,
    alreadyRegistered: already.size,
    skipped: skipped.slice(0, 50),
    skippedTotal: skipped.length,
  });
}
