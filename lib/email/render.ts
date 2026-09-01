import { ACCENT_RAMP, COLOUR, FONT, SIZE } from "@/lib/email/theme";

/**
 * The transactional email shell.
 *
 * Everything here is written for email clients, not browsers: tables for
 * layout, every style inlined, colours stated explicitly on each element, and
 * a VML fallback so the button is a real button in Outlook rather than a bare
 * link. The <style> block carries mobile sizing only — it is an enhancement,
 * and the email is complete without it.
 */

export type MetaRow = { label: string; value: string };

export type EmailContent = {
  /** The grey line after the subject in the inbox list. */
  preheader?: string;
  /** Small uppercase label above the headline. */
  eyebrow?: string;
  heading: string;
  /** Plain text. Blank lines separate paragraphs; "- " starts a bullet. */
  body: string;
  cta?: { label: string; url: string } | null;
  /** Rendered as an inset panel — session date, time, and so on. */
  meta?: MetaRow[];
  unsubscribeLink?: string;
  footerNote?: string;
  brandName?: string;
};

const escape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Turns bare URLs into links, after escaping. */
const linkify = (value: string) =>
  value.replace(
    /(https?:\/\/[^\s<]+)/g,
    `<a href="$1" style="color:${COLOUR.accent};text-decoration:underline;">$1</a>`
  );

/**
 * Plain text to formatted blocks.
 *
 * Hosts write these templates in a plain textarea, so the shape has to be
 * inferred: blank lines separate paragraphs, and a run of "- " lines becomes a
 * list. Anything cleverer would surprise whoever is editing the copy.
 */
function renderBody(text: string) {
  const blocks = text
    .trim()
    .split(/\n\s*\n/)
    .filter(Boolean);

  return blocks
    .map((block) => {
      const lines = block.split("\n");
      const bullets = lines.filter((l) => /^\s*[-•]\s+/.test(l));

      if (bullets.length === lines.length && bullets.length > 0) {
        const items = lines
          .map((line) => linkify(escape(line.replace(/^\s*[-•]\s+/, ""))))
          .map(
            (item) => `
              <tr>
                <td width="18" valign="top" style="padding:0 0 10px 0;color:${COLOUR.accent};font-size:15px;line-height:1.65;">&bull;</td>
                <td valign="top" style="padding:0 0 10px 0;color:${COLOUR.body};font-family:${FONT};font-size:15.5px;line-height:1.65;">${item}</td>
              </tr>`
          )
          .join("");

        return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;">${items}</table>`;
      }

      const html = linkify(escape(block)).replace(/\n/g, "<br />");
      return `<p style="margin:0 0 18px 0;color:${COLOUR.body};font-family:${FONT};font-size:15.5px;line-height:1.65;">${html}</p>`;
    })
    .join("");
}

/** The accent bar, as five solid cells because Outlook has no gradients. */
function accentBar() {
  const cells = ACCENT_RAMP.map(
    (colour) =>
      `<td width="20%" bgcolor="${colour}" style="background-color:${colour};height:4px;line-height:4px;font-size:0;">&nbsp;</td>`
  ).join("");

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;"><tr>${cells}</tr></table>`;
}

/** A pill button, with VML so Outlook renders a filled shape and not a link. */
function button(label: string, url: string) {
  const safeLabel = escape(label);
  const safeUrl = escape(url);

  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 26px 0;">
    <tr><td>
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
        href="${safeUrl}" style="height:50px;v-text-anchor:middle;width:280px;" arcsize="24%" stroke="f" fillcolor="${COLOUR.accent}">
        <w:anchorlock/>
        <center style="color:${COLOUR.onAccent};font-family:${FONT};font-size:15px;font-weight:600;">${safeLabel}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-- -->
      <a href="${safeUrl}"
         style="display:inline-block;background-color:${COLOUR.accent};color:${COLOUR.onAccent};font-family:${FONT};font-size:15px;font-weight:600;line-height:1;text-decoration:none;padding:17px 34px;border-radius:12px;">
        ${safeLabel}
      </a>
      <!--<![endif]-->
    </td></tr>
  </table>`;
}

/** Session details, as an inset panel rather than a sentence. */
function metaPanel(rows: MetaRow[]) {
  const cells = rows
    .map(
      (row, index) => `
      <tr>
        <td style="padding:${index === 0 ? "0" : "12px"} 0 0 0;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${COLOUR.muted};">
          ${escape(row.label)}
        </td>
      </tr>
      <tr>
        <td style="padding:4px 0 0 0;font-family:${FONT};font-size:16px;font-weight:600;color:${COLOUR.ink};">
          ${escape(row.value)}
        </td>
      </tr>`
    )
    .join("");

  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
         bgcolor="${COLOUR.inset}"
         style="background-color:${COLOUR.inset};border:1px solid ${COLOUR.hairline};border-radius:14px;margin:0 0 26px 0;">
    <tr><td style="padding:22px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${cells}</table>
    </td></tr>
  </table>`;
}

export function renderEmail(content: EmailContent) {
  const brand = content.brandName ?? "Loopinglive";
  const preheader = content.preheader ?? "";

  const footerNote =
    content.footerNote ??
    `You are receiving this because you registered on ${brand}.`;

  const unsubscribe = content.unsubscribeLink
    ? `<a href="${escape(content.unsubscribeLink)}" style="color:${COLOUR.muted};text-decoration:underline;">Unsubscribe</a>`
    : "";

  return `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="dark" />
<meta name="supported-color-schemes" content="dark" />
<title>${escape(content.heading)}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<style>
  /* Progressive enhancement only — the email is complete without this. */
  @media only screen and (max-width:620px) {
    .shell { padding:16px !important; }
    .pad { padding-left:${SIZE.paddingMobile}px !important; padding-right:${SIZE.paddingMobile}px !important; }
    .h1 { font-size:23px !important; }
  }
  a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; }
</style>
</head>
<body style="margin:0;padding:0;background-color:${COLOUR.page};">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${escape(preheader)}
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
         bgcolor="${COLOUR.page}" style="background-color:${COLOUR.page};">
    <tr>
      <td align="center" class="shell" style="padding:36px 16px;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${SIZE.card}"
               style="width:${SIZE.card}px;max-width:100%;border-collapse:separate;">

          <!-- Wordmark -->
          <tr>
            <td class="pad" style="padding:0 ${SIZE.padding}px 16px ${SIZE.padding}px;">
              <span style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${COLOUR.ink};">
                ${escape(brand)}
              </span>
              <span style="color:${COLOUR.accent};font-size:12px;font-weight:700;">.</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td bgcolor="${COLOUR.card}"
                style="background-color:${COLOUR.card};border:1px solid ${COLOUR.hairline};border-radius:18px;overflow:hidden;">

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr><td style="font-size:0;line-height:0;">${accentBar()}</td></tr>

                <tr>
                  <td class="pad" style="padding:${SIZE.padding}px;">
                    ${
                      content.eyebrow
                        ? `<p style="margin:0 0 12px 0;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${COLOUR.accent};">${escape(content.eyebrow)}</p>`
                        : ""
                    }

                    <h1 class="h1" style="margin:0 0 20px 0;font-family:${FONT};font-size:26px;line-height:1.25;font-weight:600;letter-spacing:-0.02em;color:${COLOUR.ink};">
                      ${escape(content.heading)}
                    </h1>

                    ${renderBody(content.body)}
                    ${content.meta?.length ? metaPanel(content.meta) : ""}
                    ${content.cta ? button(content.cta.label, content.cta.url) : ""}
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="pad" style="padding:22px ${SIZE.padding}px 0 ${SIZE.padding}px;">
              <p style="margin:0 0 6px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${COLOUR.muted};">
                ${escape(footerNote)}
              </p>
              <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.6;color:${COLOUR.muted};">
                ${unsubscribe}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
