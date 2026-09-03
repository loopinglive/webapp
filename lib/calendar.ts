/**
 * Calendar invites.
 *
 * The highest-leverage thing missing from registration: a webinar's entire
 * value is show-up rate, and an event sitting in someone's calendar is the
 * single most reliable way to raise it.
 *
 * Hand-built rather than pulled from a library. The format is small, the
 * escaping rules are the whole difficulty, and a dependency here would be
 * more surface than the thirty lines it replaces.
 */

type Event = {
  uid: string;
  title: string;
  description?: string | null;
  url?: string | null;
  startsAt: Date;
  durationMinutes: number;
  organiserName?: string;
  organiserEmail?: string;
};

/** ICS wants UTC as YYYYMMDDTHHMMSSZ, with no separators. */
function stamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Escapes a value for a TEXT property.
 *
 * Backslash first, or the escapes we add would themselves be escaped. Newlines
 * become a literal `\n` because a real newline would end the property.
 */
function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Folds a line to 75 octets, as the spec requires.
 *
 * Long descriptions are common and an unfolded line is rejected outright by
 * some clients — Outlook among them, which is precisely the audience least
 * likely to work around it.
 */
function fold(line: string) {
  if (line.length <= 75) return line;

  const parts: string[] = [];
  let remaining = line;
  parts.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);

  while (remaining.length > 74) {
    parts.push(` ${remaining.slice(0, 74)}`);
    remaining = remaining.slice(74);
  }
  if (remaining) parts.push(` ${remaining}`);

  return parts.join("\r\n");
}

export function buildIcs(event: Event) {
  const ends = new Date(event.startsAt.getTime() + event.durationMinutes * 60_000);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Loopinglive//Webinar//EN",
    "CALSCALE:GREGORIAN",
    // REQUEST rather than PUBLISH so clients treat it as an invitation and
    // offer to add it, instead of importing it silently.
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(event.startsAt)}`,
    `DTEND:${stamp(ends)}`,
    `SUMMARY:${escapeText(event.title)}`,
    event.description ? `DESCRIPTION:${escapeText(event.description)}` : null,
    event.url ? `URL:${event.url}` : null,
    event.url ? `LOCATION:${escapeText(event.url)}` : null,
    event.organiserEmail
      ? `ORGANIZER;CN=${escapeText(event.organiserName ?? "Loopinglive")}:mailto:${event.organiserEmail}`
      : null,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    // Two reminders, because one is not enough and three is nagging.
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(event.title)} starts in an hour`,
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:-PT10M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(event.title)} starts in ten minutes`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean) as string[];

  // CRLF throughout: some clients reject bare LF.
  return lines.map(fold).join("\r\n");
}

/**
 * A "add to Google Calendar" link.
 *
 * Worth offering alongside the file: most people on a phone would rather tap
 * a link than open a downloaded attachment.
 */
export function googleCalendarUrl(event: Event) {
  const ends = new Date(event.startsAt.getTime() + event.durationMinutes * 60_000);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${stamp(event.startsAt)}/${stamp(ends)}`,
    ...(event.description ? { details: event.description } : {}),
    ...(event.url ? { location: event.url } : {}),
  });

  return `https://calendar.google.com/calendar/render?${params}`;
}

export function outlookCalendarUrl(event: Event) {
  const ends = new Date(event.startsAt.getTime() + event.durationMinutes * 60_000);

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: event.startsAt.toISOString(),
    enddt: ends.toISOString(),
    ...(event.description ? { body: event.description } : {}),
    ...(event.url ? { location: event.url } : {}),
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params}`;
}
