/**
 * Deciding whether two addresses are the same person, and whether either is
 * worth having.
 *
 * Registration is a public form, so both questions arrive constantly. A host
 * judges themselves by the registration count and the show-up rate, and both
 * are wrong if the same person counts twice or if a throwaway address counts
 * at all.
 */

/**
 * Providers that ignore dots in the local part.
 *
 * Gmail is the one that matters — `j.o.h.n@gmail.com` and `john@gmail.com` are
 * the same inbox, and someone registering twice from two devices will often
 * type them differently.
 */
const DOT_INSENSITIVE = new Set(["gmail.com", "googlemail.com"]);

/** Providers where everything after `+` is a label, not part of the address. */
const PLUS_ADDRESSING = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "protonmail.com",
  "proton.me",
  "fastmail.com",
  "zoho.com",
]);

/** Domains that are the same inbox under a different name. */
const DOMAIN_ALIASES: Record<string, string> = {
  "googlemail.com": "gmail.com",
  "hotmail.co.uk": "hotmail.com",
  "live.co.uk": "live.com",
  "yahoo.co.uk": "yahoo.com",
  "proton.me": "protonmail.com",
  "me.com": "icloud.com",
};

/**
 * Throwaway inboxes.
 *
 * Deliberately a list of the well-known services rather than an API call: a
 * network dependency in the registration path would mean a form that fails
 * when someone else's service is down, and the long tail of one-off domains
 * is not worth that. This catches the ones that actually show up.
 */
const DISPOSABLE = new Set([
  "10minutemail.com",
  "20minutemail.com",
  "burnermail.io",
  "dispostable.com",
  "emailondeck.com",
  "fakeinbox.com",
  "getairmail.com",
  "getnada.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "guerrillamail.net",
  "harakirimail.com",
  "inboxbear.com",
  "mailcatch.com",
  "maildrop.cc",
  "mailinator.com",
  "mailnesia.com",
  "mintemail.com",
  "moakt.com",
  "mohmal.com",
  "mytemp.email",
  "sharklasers.com",
  "spam4.me",
  "spamgourmet.com",
  "temp-mail.io",
  "temp-mail.org",
  "tempail.com",
  "tempinbox.com",
  "tempmail.net",
  "tempmailo.com",
  "throwawaymail.com",
  "trashmail.com",
  "trbvm.com",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
]);

/** Domains that only exist as typos of a real one. */
const TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.cm": "gmail.com",
  "gnail.com": "gmail.com",
  "gamil.com": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "iclod.com": "icloud.com",
  "icloud.co": "icloud.com",
};

export function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at === -1 ? "" : email.slice(at + 1).trim().toLowerCase();
}

/**
 * The form two addresses share when they reach the same inbox.
 *
 * Used for matching only — never for sending. Stripping dots from a Gmail
 * address produces something Gmail accepts but the person does not recognise,
 * and the address they typed is the one that belongs on their confirmation.
 */
export function canonicalEmail(raw: string): string {
  const email = raw.trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at === -1) return email;

  let local = email.slice(0, at);
  let domain = email.slice(at + 1);

  domain = DOMAIN_ALIASES[domain] ?? domain;

  if (PLUS_ADDRESSING.has(domain)) {
    const plus = local.indexOf("+");
    if (plus > 0) local = local.slice(0, plus);
  }

  if (DOT_INSENSITIVE.has(domain)) {
    local = local.replaceAll(".", "");
  }

  // A local part that was nothing but a label is not a real address; hand back
  // the original rather than an empty one, and let validation refuse it.
  if (!local) return email;

  return `${local}@${domain}`;
}

export function isDisposableEmail(email: string): boolean {
  return DISPOSABLE.has(emailDomain(email));
}

/** The domain they meant, when the one they typed only exists as a mistake. */
export function suggestedDomain(email: string): string | null {
  return TYPOS[emailDomain(email)] ?? null;
}

export type EmailVerdict =
  | { ok: true }
  | { ok: false; reason: "disposable" | "typo"; message: string };

/**
 * The check the registration form runs.
 *
 * A typo is a suggestion rather than a refusal in spirit, but refusing is the
 * right call here: `gmial.com` does not resolve, so accepting it means a
 * registrant who never receives the link and a host who counts them anyway.
 */
export function checkEmail(email: string): EmailVerdict {
  if (isDisposableEmail(email)) {
    return {
      ok: false,
      reason: "disposable",
      message:
        "That looks like a temporary email address. Please use one you can receive the link at.",
    };
  }

  const suggestion = suggestedDomain(email);
  if (suggestion) {
    return {
      ok: false,
      reason: "typo",
      message: `Did you mean ${email.slice(0, email.lastIndexOf("@") + 1)}${suggestion}?`,
    };
  }

  return { ok: true };
}
