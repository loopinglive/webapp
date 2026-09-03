import "server-only";

import { createHash } from "node:crypto";

/**
 * Email marketing providers.
 *
 * Each exposes the same two operations — verify a credential, and upsert a
 * contact with tags — so the sync layer does not have to know which one it is
 * talking to beyond picking the right function.
 */

export type ProviderId =
  | "mailchimp"
  | "convertkit"
  | "activecampaign"
  | "gohighlevel"
  | "calendly";

export type Contact = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  tags: string[];
};

export type ProviderSettings = Record<string, string | undefined>;

export type VerifyResult = {
  ok: boolean;
  accountName?: string;
  accountId?: string;
  /** Lists, forms or audiences the host can pick from. */
  options?: { id: string; name: string }[];
  error?: string;
};

const TIMEOUT = AbortSignal.timeout.bind(AbortSignal);

async function json(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

// ─────────────────────────── Mailchimp ───────────────────────────

/** Mailchimp puts the datacentre after the dash in the key itself. */
function mailchimpBase(apiKey: string) {
  const dc = apiKey.split("-")[1];
  if (!dc) throw new Error("A Mailchimp key looks like `key-us21`.");
  return `https://${dc}.api.mailchimp.com/3.0`;
}

export async function verifyMailchimp(apiKey: string): Promise<VerifyResult> {
  try {
    const base = mailchimpBase(apiKey);
    const response = await fetch(`${base}/lists?count=100&fields=lists.id,lists.name`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: TIMEOUT(10_000),
    });

    if (!response.ok) {
      return { ok: false, error: `Mailchimp rejected the key (${response.status}).` };
    }

    const data = await json(response);
    const lists = (data.lists as { id: string; name: string }[] | undefined) ?? [];

    return {
      ok: true,
      accountName: apiKey.split("-")[1],
      options: lists.map((list) => ({ id: list.id, name: list.name })),
    };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function syncMailchimp(
  apiKey: string,
  settings: ProviderSettings,
  contact: Contact
) {
  const listId = settings.listId;
  if (!listId) throw new Error("No Mailchimp audience selected.");

  const base = mailchimpBase(apiKey);
  // Mailchimp addresses a member by the MD5 of the lowercased email. That is
  // their addressing scheme, not a security choice on our part.
  const id = createHash("md5").update(contact.email.toLowerCase()).digest("hex");

  const response = await fetch(`${base}/lists/${listId}/members/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_address: contact.email,
      status_if_new: "subscribed",
      merge_fields: {
        FNAME: contact.firstName,
        LNAME: contact.lastName,
        ...(contact.phone ? { PHONE: contact.phone } : {}),
      },
      tags: contact.tags,
    }),
    signal: TIMEOUT(10_000),
  });

  if (!response.ok) {
    const body = await json(response);
    throw new Error((body.detail as string) ?? `Mailchimp returned ${response.status}`);
  }
}

// ─────────────────────────── ConvertKit ───────────────────────────

export async function verifyConvertKit(apiKey: string): Promise<VerifyResult> {
  try {
    const response = await fetch(
      `https://api.convertkit.com/v3/forms?api_key=${encodeURIComponent(apiKey)}`,
      { signal: TIMEOUT(10_000) }
    );

    if (!response.ok) {
      return { ok: false, error: `ConvertKit rejected the key (${response.status}).` };
    }

    const data = await json(response);
    const forms = (data.forms as { id: number; name: string }[] | undefined) ?? [];

    return {
      ok: true,
      options: forms.map((form) => ({ id: String(form.id), name: form.name })),
    };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function syncConvertKit(
  apiKey: string,
  settings: ProviderSettings,
  contact: Contact
) {
  const formId = settings.formId;
  if (!formId) throw new Error("No ConvertKit form selected.");

  const response = await fetch(
    `https://api.convertkit.com/v3/forms/${formId}/subscribe`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        email: contact.email,
        first_name: contact.firstName,
        // ConvertKit creates tags on demand when passed by name, which avoids
        // a lookup-or-create round trip per tag.
        tags: contact.tags,
      }),
      signal: TIMEOUT(10_000),
    }
  );

  if (!response.ok) {
    throw new Error(`ConvertKit returned ${response.status}`);
  }
}

// ───────────────────────── ActiveCampaign ─────────────────────────

function acBase(url: string) {
  return url.replace(/\/+$/, "");
}

export async function verifyActiveCampaign(
  apiKey: string,
  settings: ProviderSettings
): Promise<VerifyResult> {
  const apiUrl = settings.apiUrl;
  if (!apiUrl) return { ok: false, error: "An ActiveCampaign account URL is required." };

  try {
    const response = await fetch(`${acBase(apiUrl)}/api/3/lists?limit=100`, {
      headers: { "Api-Token": apiKey },
      signal: TIMEOUT(10_000),
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `ActiveCampaign rejected the credentials (${response.status}).`,
      };
    }

    const data = await json(response);
    const lists = (data.lists as { id: string; name: string }[] | undefined) ?? [];

    return {
      ok: true,
      options: lists.map((list) => ({ id: list.id, name: list.name })),
    };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function syncActiveCampaign(
  apiKey: string,
  settings: ProviderSettings,
  contact: Contact
) {
  const apiUrl = settings.apiUrl;
  const listId = settings.listId;
  if (!apiUrl) throw new Error("No ActiveCampaign account URL configured.");

  const base = acBase(apiUrl);
  const headers = { "Api-Token": apiKey, "Content-Type": "application/json" };

  const sync = await fetch(`${base}/api/3/contact/sync`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      contact: {
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        ...(contact.phone ? { phone: contact.phone } : {}),
      },
    }),
    signal: TIMEOUT(10_000),
  });

  if (!sync.ok) throw new Error(`ActiveCampaign returned ${sync.status}`);

  const payload = await json(sync);
  const contactId = (payload.contact as { id?: string } | undefined)?.id;
  if (!contactId) return;

  if (listId) {
    await fetch(`${base}/api/3/contactLists`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        contactList: { list: listId, contact: contactId, status: 1 },
      }),
      signal: TIMEOUT(10_000),
    });
  }

  // Tags are ids in ActiveCampaign, so each one is resolved or created first.
  for (const tag of contact.tags) {
    const existing = await fetch(
      `${base}/api/3/tags?search=${encodeURIComponent(tag)}`,
      { headers, signal: TIMEOUT(10_000) }
    );
    const found = (await json(existing)).tags as { id: string; tag: string }[] | undefined;
    let tagId = found?.find((row) => row.tag === tag)?.id;

    if (!tagId) {
      const created = await fetch(`${base}/api/3/tags`, {
        method: "POST",
        headers,
        body: JSON.stringify({ tag: { tag, tagType: "contact" } }),
        signal: TIMEOUT(10_000),
      });
      tagId = ((await json(created)).tag as { id?: string } | undefined)?.id;
    }

    if (tagId) {
      await fetch(`${base}/api/3/contactTags`, {
        method: "POST",
        headers,
        body: JSON.stringify({ contactTag: { contact: contactId, tag: tagId } }),
        signal: TIMEOUT(10_000),
      });
    }
  }
}

// ────────────────────────── GoHighLevel ──────────────────────────

export async function verifyGoHighLevel(apiKey: string): Promise<VerifyResult> {
  try {
    const response = await fetch("https://rest.gohighlevel.com/v1/contacts/?limit=1", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: TIMEOUT(10_000),
    });

    return response.ok
      ? { ok: true }
      : { ok: false, error: `GoHighLevel rejected the key (${response.status}).` };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export async function syncGoHighLevel(
  apiKey: string,
  _settings: ProviderSettings,
  contact: Contact
) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const lookup = await fetch(
    `https://rest.gohighlevel.com/v1/contacts/lookup?email=${encodeURIComponent(contact.email)}`,
    { headers, signal: TIMEOUT(10_000) }
  );

  const existing = lookup.ok
    ? ((await json(lookup)).contacts as { id: string; tags?: string[] }[] | undefined)?.[0]
    : undefined;

  if (existing) {
    // Merge rather than replace — overwriting would drop tags the host set in
    // GoHighLevel itself.
    const merged = [...new Set([...(existing.tags ?? []), ...contact.tags])];
    const response = await fetch(
      `https://rest.gohighlevel.com/v1/contacts/${existing.id}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({ tags: merged }),
        signal: TIMEOUT(10_000),
      }
    );
    if (!response.ok) throw new Error(`GoHighLevel returned ${response.status}`);
    return;
  }

  const response = await fetch("https://rest.gohighlevel.com/v1/contacts/", {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
      ...(contact.phone ? { phone: contact.phone } : {}),
      tags: contact.tags,
    }),
    signal: TIMEOUT(10_000),
  });

  if (!response.ok) throw new Error(`GoHighLevel returned ${response.status}`);
}

// ─────────────────────────── Calendly ───────────────────────────

export async function getCalendlyUser(accessToken: string) {
  const response = await fetch("https://api.calendly.com/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: TIMEOUT(10_000),
  });
  if (!response.ok) throw new Error(`Calendly returned ${response.status}`);
  return (await json(response)).resource as {
    uri: string;
    name: string;
    email: string;
    current_organization: string;
  };
}

export async function getCalendlyEventTypes(accessToken: string, userUri: string) {
  const response = await fetch(
    `https://api.calendly.com/event_types?user=${encodeURIComponent(userUri)}&active=true`,
    { headers: { Authorization: `Bearer ${accessToken}` }, signal: TIMEOUT(10_000) }
  );
  if (!response.ok) throw new Error(`Calendly returned ${response.status}`);
  return ((await json(response)).collection ?? []) as {
    uri: string;
    name: string;
    scheduling_url: string;
  }[];
}
