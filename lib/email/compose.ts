import type { EmailContent, MetaRow } from "@/lib/email/render";

/**
 * Turns a plain-text template into the structured content the shell renders.
 *
 * Hosts edit these templates as plain text, and that stays true — nobody has
 * to learn a markup language to change a reminder. The structure is inferred
 * instead: the first link in the copy becomes the button, and the session
 * details become the inset panel.
 */

/** The label above the headline, by template. Absent is fine — it is optional. */
const EYEBROW: Record<string, string> = {
  registration_confirmation: "You are registered",
  reminder_24h: "Tomorrow",
  reminder_1h: "In one hour",
  reminder_15min: "In 15 minutes",
  reminder_now: "Live now",
  reminder_ending_soon: "Ending soon",
  replay_access: "Your replay",
  followup_no_show: "You missed it",
  followup_watched_low: "Thanks for stopping by",
  followup_watched_mid_low: "Thanks for watching",
  followup_watched_mid_high: "Thanks for watching",
  followup_watched_high: "Thanks for watching",
  followup_watched_complete: "You watched it all",
  followup_clicked_offer: "About the offer",
  buyer_confirmation: "Welcome aboard",
  re_engagement_initial: "Still interested?",
  re_engagement_weekly: "Next session",
};

/** Which sessions to show a date/time panel for. */
const SHOWS_SESSION_DETAILS = new Set([
  "registration_confirmation",
  "reminder_24h",
  "reminder_1h",
  "reminder_15min",
  "re_engagement_initial",
  "re_engagement_weekly",
]);

/**
 * Picks the call to action.
 *
 * The label is chosen from which variable the URL came from rather than from
 * the URL itself, so a host rewriting the copy cannot end up with a button
 * that says the wrong thing.
 */
function pickCta(
  body: string,
  variables: Record<string, string>,
  templateKey: string
): { cta: EmailContent["cta"]; body: string } {
  const candidates: { url: string; label: string }[] = [
    {
      url: variables.replay_link,
      label: "Watch the replay",
    },
    {
      url: variables.offer_url,
      label: variables.offer_title ? `Get ${variables.offer_title}` : "View the offer",
    },
    {
      url: variables.webinar_link,
      label:
        templateKey === "registration_confirmation"
          ? "View your seat"
          : templateKey.startsWith("re_engagement")
            ? "Save my seat"
            : "Join the webinar",
    },
  ].filter((candidate) => candidate.url && body.includes(candidate.url));

  const chosen = candidates[0];
  return { cta: chosen ? { label: chosen.label, url: chosen.url } : null, body };
}

/**
 * Removes copy that the design now carries.
 *
 * The default templates were written for a plain-text email, so they spell out
 * "Date: …", "Time: …", "Join link: …" as lines of prose. Once those become a
 * details panel and a button, leaving them in the body says everything twice.
 * The plain-text alternative is built from the untouched body, so nothing is
 * lost for clients that cannot render HTML.
 */
function stripRedundant(body: string, ctaUrl: string | undefined, meta: MetaRow[]) {
  const hasWhen = meta.some((row) => row.label === "When");
  const hasTitle = meta.some((row) => row.label === "Webinar");

  const kept: string[] = [];

  for (const line of body.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed) {
      kept.push(line);
      continue;
    }

    if (hasWhen && /^(date|time|when)\s*:/i.test(trimmed)) continue;
    if (hasTitle && /^(webinar|title)\s*:/i.test(trimmed)) continue;

    if (ctaUrl && trimmed.includes(ctaUrl)) {
      // The URL is the button now. Anything that was only a label for it goes;
      // a real sentence keeps its words and loses just the link, so copy like
      // "The next session runs Friday: <url>" stays meaningful.
      const remainder = trimmed
        .replace(ctaUrl, "")
        .replace(/\s+/g, " ")
        .replace(/[\s:\-–—]+$/, "")
        .trim();

      if (remainder.length <= 24) continue;
      kept.push(/[.!?]$/.test(remainder) ? remainder : `${remainder}.`);
      continue;
    }

    kept.push(line);
  }

  // A lead-in such as "Your webinar details:" is left stranded once the lines
  // beneath it are gone, so drop any colon-ending line with nothing under it.
  // A lead-in such as "Your webinar details:" is stranded once the lines
  // directly beneath it are gone. Only the *next* line matters — looking
  // further ahead finds the next paragraph and wrongly keeps the lead-in.
  const final = kept.filter((line, index) => {
    if (!/:\s*$/.test(line.trim())) return true;
    return Boolean(kept[index + 1]?.trim());
  });

  return final.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function sessionMeta(
  variables: Record<string, string>,
  templateKey: string
): MetaRow[] {
  if (!SHOWS_SESSION_DETAILS.has(templateKey)) return [];

  const isNext = templateKey.startsWith("re_engagement");
  const date = isNext
    ? variables.next_session_date || variables.webinar_date
    : variables.webinar_date;
  const time = isNext
    ? variables.next_session_time || variables.webinar_time
    : variables.webinar_time;

  const rows: MetaRow[] = [];
  if (variables.webinar_title) {
    rows.push({ label: "Webinar", value: variables.webinar_title });
  }
  if (date && time) {
    rows.push({ label: "When", value: `${date} at ${time}` });
  } else if (date) {
    rows.push({ label: "When", value: date });
  }

  return rows;
}

/**
 * The preview line in the inbox list.
 *
 * Without one, clients fall back to scraping the first words of the body,
 * which for a designed email is often the greeting — "Hi Sarah," tells the
 * reader nothing about whether to open it.
 */
function preheaderFor(body: string) {
  const firstProse = body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .find((block) => block.length > 24 && !/^https?:\/\//.test(block));

  return (firstProse ?? body.trim()).replace(/\s+/g, " ").slice(0, 140);
}

export function composeEmail(input: {
  subject: string;
  body: string;
  variables: Record<string, string>;
  templateKey?: string | null;
  brandName?: string;
  unsubscribeLink?: string;
}): EmailContent {
  const templateKey = input.templateKey ?? "";
  const { cta } = pickCta(input.body, input.variables, templateKey);
  const meta = sessionMeta(input.variables, templateKey);
  const body = stripRedundant(input.body, cta?.url, meta);

  return {
    preheader: preheaderFor(body),
    eyebrow: EYEBROW[templateKey],
    heading: input.subject || input.variables.webinar_title || "Loopinglive",
    body,
    cta,
    meta,
    brandName: input.brandName,
    unsubscribeLink: input.unsubscribeLink,
  };
}
