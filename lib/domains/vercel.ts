import "server-only";

/**
 * Custom domains, for real.
 *
 * A CNAME lookup only proves the customer typed the record correctly. It says
 * nothing about whether the domain will serve anything, and the old flow
 * declared success on that alone: the customer saw "connected", visited their
 * domain, and got nothing — the platform edge rejects hostnames it has never
 * heard of, before any application code runs, and no certificate exists for a
 * name nobody registered.
 *
 * Three things have to happen, and this module owns the first two:
 *
 *   1. register the domain against the Vercel project, which is what makes
 *      the edge accept it and starts certificate issuance;
 *   2. read back the configuration Vercel expects, so the UI can show the
 *      exact records to add rather than a hardcoded guess;
 *   3. resolve the hostname to a tenant at request time (see proxy.ts).
 *
 * Everything degrades honestly when VERCEL_API_TOKEN is unset: domains stay
 * "pending" and the UI says the platform is not configured for them, rather
 * than claiming a domain works when nothing was provisioned.
 */

const API = "https://api.vercel.com";

/**
 * Where customers point their CNAME.
 *
 * Defaults to Vercel's own target, which already resolves and needs nothing
 * created on our side. Set CUSTOM_DOMAIN_CNAME_TARGET to a branded host
 * (cname.loopinglive.com) once that record exists and is itself a CNAME to
 * cname.vercel-dns.com — pointing customers at a name that does not resolve
 * is how the previous version broke.
 */
export const CNAME_TARGET =
  process.env.CUSTOM_DOMAIN_CNAME_TARGET?.trim() || "cname.vercel-dns.com";

export function domainsConfigured(): boolean {
  return Boolean(process.env.VERCEL_API_TOKEN?.trim() && process.env.VERCEL_PROJECT_ID?.trim());
}

function credentials() {
  const token = process.env.VERCEL_API_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  if (!token || !projectId) {
    throw new Error("Custom domains are not configured on this deployment.");
  }
  // Team-scoped projects need the team id on every call or the API 404s.
  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  return { token, projectId, query: teamId ? `?teamId=${teamId}` : "" };
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const { token } = credentials();
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = (await response.json().catch(() => null)) as
    | (T & { error?: { code?: string; message?: string } })
    | null;

  if (!response.ok) {
    throw new Error(body?.error?.message ?? `Vercel API returned ${response.status}`);
  }
  return body as T;
}

export type DomainStatus = {
  /** Registered against the project — the edge will accept requests for it. */
  registered: boolean;
  /** DNS resolves to us and the certificate is live. */
  verified: boolean;
  /** True while DNS still points elsewhere, or has not propagated. */
  misconfigured: boolean;
  /** Exactly what the customer must add at their DNS provider. */
  records: { type: string; name: string; value: string }[];
  message: string;
};

function recordsFor(domain: string): DomainStatus["records"] {
  const parts = domain.split(".");
  const isApex = parts.length <= 2;

  // An apex domain cannot hold a CNAME, so it takes an A record instead —
  // getting this wrong is the single most common reason a setup never works.
  return isApex
    ? [{ type: "A", name: "@", value: "76.76.21.21" }]
    : [{ type: "CNAME", name: parts[0], value: CNAME_TARGET }];
}

/** Registers the domain so the edge accepts it and a certificate is issued. */
export async function addDomain(domain: string): Promise<DomainStatus> {
  const { projectId, query } = credentials();

  try {
    await call(`/v10/projects/${projectId}/domains${query}`, {
      method: "POST",
      body: JSON.stringify({ name: domain }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    // Already attached to this project is success, not failure — a customer
    // re-running verification must not be punished for it.
    const alreadyOurs = /already in use by this project|domain_already_in_use/i.test(message);
    if (!alreadyOurs) {
      // Held by a different Vercel account entirely: actionable, so say so.
      if (/already in use|conflict/i.test(message)) {
        throw new Error(
          `${domain} is already connected to another Vercel project. Remove it there first, then try again.`
        );
      }
      throw error;
    }
  }

  return domainStatus(domain);
}

/** Current registration, DNS and certificate state for a domain. */
export async function domainStatus(domain: string): Promise<DomainStatus> {
  const { projectId, query } = credentials();

  const config = await call<{ misconfigured?: boolean }>(
    `/v6/domains/${domain}/config${query}`
  ).catch(() => ({ misconfigured: true }));

  const project = await call<{ verified?: boolean; verification?: unknown[] }>(
    `/v9/projects/${projectId}/domains/${domain}${query}`
  ).catch(() => null);

  const registered = Boolean(project);
  const misconfigured = config.misconfigured !== false;
  const verified = registered && Boolean(project?.verified) && !misconfigured;

  return {
    registered,
    verified,
    misconfigured,
    records: recordsFor(domain),
    message: !registered
      ? "Not registered yet."
      : verified
        ? "Live. The certificate is issued and the domain is serving."
        : misconfigured
          ? "Waiting for DNS. Add the record below; changes can take up to 48 hours."
          : "DNS looks right — finishing the certificate.",
  };
}

/** Asks Vercel to re-check DNS now rather than waiting for its own schedule. */
export async function verifyDomain(domain: string): Promise<DomainStatus> {
  const { projectId, query } = credentials();
  await call(`/v9/projects/${projectId}/domains/${domain}/verify${query}`, {
    method: "POST",
  }).catch(() => null);
  return domainStatus(domain);
}

/** Detaches a domain, freeing it for reuse. Never throws — disconnecting must always succeed locally. */
export async function removeDomain(domain: string): Promise<void> {
  try {
    const { projectId, query } = credentials();
    await call(`/v9/projects/${projectId}/domains/${domain}${query}`, { method: "DELETE" });
  } catch {
    // Already gone, or the platform has no token — either way the local row
    // is what the customer sees, and the caller is clearing that regardless.
  }
}
