import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { PLATFORM_EXAMPLE_VARIABLES } from "@/lib/email/example-variables";
import {
  PLATFORM_TEMPLATES,
  renderPlatformEmail,
} from "@/lib/email/platform-templates";

export const dynamic = "force-dynamic";

/**
 * Lists every platform email, and renders one when `key` is supplied.
 *
 * The rendered HTML is returned as a string rather than served as a document
 * so the client can drop it into a sandboxed iframe — the preview must not be
 * able to run script against the admin origin.
 */
export async function GET(request: Request) {
  const { response: denied } = await requireAdmin();
  if (denied) return denied;

  const key = new URL(request.url).searchParams.get("key");

  if (!key) {
    return NextResponse.json({
      templates: PLATFORM_TEMPLATES.map((template) => ({
        key: template.key,
        label: template.label,
        audience: template.audience,
        category: template.category,
        transactional: template.transactional,
        hasCta: Boolean(template.cta),
      })),
    });
  }

  try {
    const { subject, html, text } = renderPlatformEmail(
      key,
      PLATFORM_EXAMPLE_VARIABLES,
      {
        brandName: "Loopinglive",
        unsubscribeLink: PLATFORM_EXAMPLE_VARIABLES.unsubscribe_link,
      }
    );

    // Anything left unresolved is a template bug, so surface it rather than
    // letting a preview quietly show "{{plan_name}}" as if it were copy.
    const unresolved = [
      ...new Set([...`${subject}${html}`.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1])),
    ];

    return NextResponse.json({ subject, html, text, unresolved });
  } catch {
    return NextResponse.json({ error: "Unknown email" }, { status: 404 });
  }
}
